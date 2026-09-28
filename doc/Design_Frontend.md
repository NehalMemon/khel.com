# DESIGN_FRONTEND.md — Khel.com Frontend Specification

> This is the frontend half of the old `DESIGN.md`, split per team agreement (see `.agents/rules/team-workflow-rules.md`). This one is Abid's — follow it. The backend half, `DESIGN_BACKEND.md`, is advisory for Nehal only.
>
> Sources: `doc/ARCHITECTURE.md`, `doc/SCHEMA.md`, `doc/API_CONTRACTS.md`, the Backend→Frontend Handoff doc's "User Authentication & Profile Synchronization" entry, both `supabase/migrations/*.sql`, and the existing `web/` Vite proof-of-concept (kept as reference, not a base to build on — see prior notes on it).

## 0. Purpose & Scope

What to build for the Next.js frontend: the app split, the roles, the confirmed auth contract, the data shapes, the screens, and where the design system starts. `ARCHITECTURE.md` covers the *how* (RPC-driven, thin client); this covers the *what*.

## 1. Product Snapshot

Khel.com is an indoor sports venue/court booking marketplace for Karachi (futsal, badminton, etc.). Customers discover venues, book a court/time slot, and pay via digital wallet. Venue owners list and run their own venues. Commission is **not** a frontend constant: it is read from `app_config.commission_rate` at runtime and can be changed from the admin console without a redeploy. The MVP launch value was 0%, tracked rather than hardcoded.

## 2. Three Apps, Not Namespaces

> **Changed 2026-09-28.** This section originally specified **two** apps, with the partner
> portal living inside the user app under `/partner/*`. That was built and then re-split
> into three independent deployments, because the venue-owner portal needs its own
> deployment cadence, its own `venue_owner`-only route guard, and its own signup surface.
> `Team_Workflow_Rules.md` §2 was updated to match. Everything else in this document
> stands.

Per the team's working rules, this is built as **three separate Next.js projects**, not one
app with route groups:

- **User app** (`apps/user`, default port 3000) — customer marketplace only. Customer signup
  is the only public signup form here, and it can only ever create a `customer`
  (`PublicSignupRole = Extract<UserRole, "customer">`).
  - `/`, `/venues/[slug]`, `/venues/[slug]/book`, `/bookings`, `/bookings/confirmation/[bookingRef]`, `/profile`, `/auth/sign-in`, `/auth/sign-up`
- **Venue owner app** (`apps/venue-owner`, default port 3001) — the partner portal, with a
  `venue_owner`-only route guard. Signup lives at `/join`.
  - `/`, `/courts`, `/schedule`, `/bookings`, `/profile`, `/join`, `/sign-in`
- **Admin app** (`apps/admin`, default port 3002) — a fully separate project, `admin` and
  `super_admin` only, routes at root level since the whole app is already admin-scoped.
  - `/`, `/venues/review`, `/venues`, `/courts`, `/partners`, `/users`, `/bookings`, `/config`, `/sign-in`

Cross-app navigation is environment-driven, never an in-app route:
`NEXT_PUBLIC_PARTNER_APP_URL`, `NEXT_PUBLIC_ADMIN_APP_URL` (read by the user app) and
`NEXT_PUBLIC_USER_APP_URL` (read by the venue-owner app for the read-only venue preview
link). Each reader validates that the value is an absolute `http(s)` URL before using it as
an `href`, so a misconfigured variable cannot become a `javascript:` or protocol-relative
link.

## 3. Roles → App → Access

| DB role (`profiles.role`) | App | What RLS grants today |
|---|---|---|
| `customer` | User | `SELECT` published venues/courts/slots; `SELECT`/`INSERT` own bookings |
| `venue_owner` | Venue owner | Full CRUD on venues/courts/slots they own; `SELECT`/`UPDATE` on bookings tied to their venues |
| `venue_staff` | — | Enum value exists; **no RLS policy grants it anything yet** beyond the universal own-profile rule. Don't build staff-specific UI until Nehal defines the boundary (`DESIGN_BACKEND.md` Open Items) |
| `admin` | Admin | `is_admin()` → bypasses tenant isolation, full access |
| `super_admin` | Admin | Same RLS as `admin` today. Reserve the UI distinction for platform-config actions once `app_config` exists |

Nobody signs up as `admin` or `super_admin` through a public form, and nobody signs up as
`venue_owner` through the user app — the user app's `PublicSignupRole` is narrowed to
`"customer"` at the type level so a future form cannot widen it by accident. See §5 for why
this matters.

## 4. Data Model (plain language)

- **`profiles`** — extends `auth.users`. `name`, `phone` (unique, not null), `avatar_url`, `role`. Created automatically on signup — see §5, never write to this table directly from the frontend.
- **`venues`** — owned by a profile. `slug` (unique), `address`, `coordinates` (PostGIS point, for "near me" search), `amenities` (freeform `jsonb`), `status`: `draft → submitted → under_review → {approved → published | rejected}`, then `published ↔ suspended`/`archived`.
- **`courts`** — belongs to a venue. `name`, `sport_type` (free text — seed data uses `"Futsal"`, `"Badminton"`), `hourly_rate`, `metadata` (`jsonb`).
- **`slots`** — bookable inventory per court/date/time. `status`: `available → held (via `hold_slot`, lifetime from `app_config.hold_expiry_minutes`) → booked`, or `blocked`/`maintenance` set by the owner.
- **`bookings`** — `status` (`confirmed → completed | cancelled_by_customer | cancelled_by_venue | no_show`) and `payment_status` (`pending → paid | failed | refunded`) are **independent fields** — don't conflate them in the UI. Also carries the payout ledger: `total_charged`, `venue_payout_amount`, `commission_amount_snapshot`.

Prices are in PKR (seed data: futsal 3000–5000/hr, badminton 1200/hr) — format currency accordingly.

## 5. Auth & Profile Sync — Confirmed Contract

This is now implemented on the backend (`staging` branch, migration `20260924112825_sync_auth_users_to_profiles.sql`). **The frontend must only call Supabase Auth methods — never insert or upsert into `public.profiles` directly.** A trigger (`handle_new_user`) provisions the profile row automatically on signup.

```typescript
// Sign up (customer or partner — role decides which)
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name: trimmedName,
      phone: formattedPhone,   // E.164, e.g. "+923001234567"
      role: role,              // 'customer' or 'venue_owner' — NEVER 'admin'/'super_admin' from a public form
    },
  },
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
```

**Field handling in the trigger** (so the UI can anticipate it, not re-implement it):
- `name` — from `options.data.name`, falls back to `'Unknown'` if empty. Validate as required, trimmed, non-empty before sending anyway — don't rely on the fallback.
- `phone` — from `options.data.phone`. If missing, the trigger assigns `'pending-' || id` to satisfy the `NOT NULL UNIQUE` constraint rather than failing the signup. **The frontend should still always send a real phone number** — the fallback exists for safety, not as a supported "skip phone" flow.
- `role` — from `options.data.role`, defaults to `'customer'` if absent.
- `avatar_url` — from `options.data.avatar_url`, nullable, not needed at signup.

**Validation before calling `signUp`:**
- Name: required, non-empty, trimmed.
- Phone: validate against `^((\+92)|(0092)|(0))?3[0-9]{9}$`, then **normalize to full E.164 (`+92XXXXXXXXXX`) before sending** — don't send the raw local format.
- Password: minimum 8 characters, show a strength indicator.
- Role: pass `'venue_owner'` from the partner join form, `'customer'` (or omit, since it defaults) from the marketplace signup form. **Never expose a role selector that includes `admin`/`super_admin` anywhere in the User app.**

**States to handle:**
- **Pending-phone banner** — if a signed-in user's profile has `phone LIKE 'pending-%'`, show a banner/modal prompting them to add a real phone number before booking or listing a venue. This can happen for any user whose signup somehow reached the trigger without a phone value.
- **Duplicate phone** — surface Supabase's error inline: *"This phone number is already linked to an account."*

**Worth flagging to Nehal, not assuming either way (see `DESIGN_BACKEND.md` §5):** the handoff doc describes the trigger as validating `role` *is a legal enum value*, not that it *restricts which values are self-assignable*. If that's accurate, nothing stops a client from calling `signUp` directly with `role: 'super_admin'` in the payload, bypassing whatever the frontend UI offers. The frontend will never expose that path, but that alone doesn't close it server-side — worth a direct confirmation before this ships.

## 6. State Machines (condensed — full detail lives in `DESIGN_BACKEND.md`)

- **Venue:** `draft → submitted → under_review → {approved → published | rejected}`; `published ↔ suspended`/`archived`. What triggers `approved → published` isn't documented yet.
- **Slot:** `available → held (via `hold_slot`, lifetime from `app_config.hold_expiry_minutes`) → booked`, or `→ blocked`/`maintenance`. Nothing currently reverts an expired hold back to `available` — the UI treats a `hold_slot` conflict (slot taken) as a normal, expected response, not an edge case.
- **Booking / payment:** two independent fields, see §4.

## 7. Screen Inventory

> Status annotated 2026-09-28. Every screen below is built. Open items are the backend gaps
> listed in `DESIGN_BACKEND.md` §5, not missing UI.

### User app — customer side
1. **Discover** — built. Nearby mode via `search_venues_nearby` plus an all-venues mode,
   search and sport filters, distance badges, and Cloudinary cover images. Sport facets are
   derived from distinct `courts.sport_type` values because there is no `sports` table
2. **Venue detail** — built. Info, amenities, photos, rating, courts list
3. **Slot picker** — built. Date/time grid over `available` slots for a court
4. **Checkout** — built to the hold. `hold_slot` → server-driven countdown → payment is
   **blocked**; the UI shows a "Payment connection pending" notice instead of a fake purchase
5. **Booking confirmation** — built. Reads `booking_ref`; safe to load twice
6. **My Bookings** — built. Status and payment badges kept separate, cancel action
7. **Sign up / sign in** — built per §5's contract. Customer role only
8. **Profile** — built. Name/phone/avatar, pending-phone banner, subscription tier badge

### Venue owner app
| Screen | Status |
|---|---|
| Join / sign in (`/join`, `/sign-in`) | Built per §5's contract, `venue_owner` role only, safe same-origin `next` redirect |
| Portal shell (nav: Dashboard / Courts / Schedule / Bookings / Profile) | Built |
| Dashboard | Built. Venue status workflow, per-venue metrics, published-venue preview link |
| My Venue | Built. Venue CRUD, amenities, PostGIS coordinates, Cloudinary photo upload (max 8, stored in `amenities.images`) |
| Courts | Built. List/add/edit courts; sport suggestions derived from the owner's own inventory |
| Schedule | Built. Bulk slot generation, per-slot block/open, held-slot expiry shown. Stale-hold cleanup is still a backend open item |
| Bookings | Built. Bookings for owned venues, status + payment badges kept separate, payout figures |
| Profile | Built. Name/phone, role and subscription tier badges |

### Admin app
1. **Sign in only — no public sign-up screen.** Admin accounts aren't self-service; see
   `DESIGN_BACKEND.md` §5 for the open question on how they're provisioned
2. **Venue review queue** — built. `submitted` → `under_review` → `approved`/`rejected`, with
   listing photos and courts in the review card. The `approved → published` step is
   deliberately disabled; the allowed transitions are declared once in
   `apps/admin/src/lib/queries.ts` (`canTransitionVenue`)
3. **All venues** — built. Every venue with courts, derived sports, rate range, and photo count
4. **Courts** — built. Platform-wide list with inline name/sport/rate editing
5. **Venue owners** — built. `venue_owner` accounts matched to their venues via
   `venues.owner_id`. Staff accounts are excluded because `venue_staff` has no RLS
6. **Users** — built. Search, role filter, and role/subscription-tier editing. Backed by
   `ProfilePrivilegedUpdate`; the `subscription_tier` trigger still guards every write and
   rejects self-promotion
7. **Platform config** — built. Live read/write of `app_config` (commission, search radius,
   hold expiry) with client-side range validation; the `admin_update_app_config` policy
   enforces `is_admin()` server-side
8. **Bookings oversight** — built. Platform-wide view with search and payment filter

## 8. What the Frontend Can Call Today

> Refreshed 2026-09-28 against the migrations actually present in `supabase/migrations/`.
> The previous version of this table predated the `hold_slot` and `app_config` migrations.

| Capability | Status |
|---|---|
| `supabase.auth.signUp` / `signInWithPassword` | **Ready** — contract confirmed in §5 |
| Reads on `venues`/`courts`/`slots`/`bookings` per RLS in §3 | **Ready** |
| `hold_slot(p_court_id, p_date, p_start_time)` | **Shipped** — `20260925123004_add_freemium_holds.sql`. Returns `Array<{ slot_id, held_until }>`. The checkout UI drives its countdown from `held_until`; there is no client-side TTL constant |
| `search_venues_nearby(p_lat, p_lon, p_radius_km)` | **Shipped** — `20260925142542`/`20260925141031`. Powers nearby discovery; radius comes from `app_config`, and a denied geolocation prompt falls back to central Karachi |
| `app_config` table | **Shipped** — `20260925142542_create_app_config.sql`. All three apps read it at runtime via `src/lib/app-config.ts`; the admin console edits it. Commission, search radius, and hold expiry are no longer hardcoded anywhere |
| `confirm_booking_with_payment(p_booking_id, p_gateway_ref, p_amount_paid)` | **Shipped but webhook/admin-only** — never client-callable. Requires a booking that already exists |
| Payment initiation | **No Edge Function yet**, gateway not chosen. The customer app stops after the hold and says so explicitly |
| Booking creation from a customer request | **No contract yet** — the confirmation RPC expects a pre-existing booking, so there is no safe client path to create one |
| Stale-hold cleanup | **No scheduled job yet** — expired holds stay `held` until a customer collides with them; the RPC stays authoritative |

## 9. Build Notes for the Next.js Port

- **TanStack Query is mandatory** for every read/write, per `ARCHITECTURE.md` — the POC used raw `useEffect`, don't carry that forward.
- **Supabase client split**: browser client + server client via `@supabase/ssr`, since Next.js needs SSR-safe cookie-based sessions (the POC's single browser-only client won't work here).
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (replacing the POC's `VITE_` prefix).
- **Components**: shadcn/ui in both apps (`npx shadcn@latest init`, Tailwind v4, CSS-first config — no `tailwind.config.js`). Install and configure it as part of scaffolding rather than leaving it for later.
- **Types**: each app keeps a hand-maintained mirror at `src/lib/database.types.ts`. It was
  originally seeded from `web/src/types/database.types.ts`, but that file was stale — it
  declared a `courts.sport_id` column that no migration ever creates. The `sport_id` entries
  have been removed, and the three app mirrors are now the maintained source of truth. Run
  `supabase gen types typescript` after future migrations and reconcile by hand rather than
  overwriting; never reintroduce `courts.sport_id`.
- Per the existing `.agents/rules/frontend-rules.md`: no `any` types, shared UI lives in `components/ui/`, no hardcoded business rules (commission/radius/durations come from `app_config` once it exists).

## 10. Design System Starting Point

The POC's `Button`/`Alert`/`Spinner` hardcode hex colors inline — fine for a connectivity spike, not for the real build. With shadcn/ui now in the picture:

- shadcn's own variant pattern (via `class-variance-authority`) replaces the POC's manual `switch` statements — keep the same *names* though, since they're already sensible: `Button(primary|secondary|outline|danger)` → shadcn's `default|secondary|outline|destructive`; `Alert(error|warning|info|success)`.
- Theme shadcn's CSS variables deliberately for khel.com rather than leaving the default zinc/neutral base color — worth a short, focused pass once there are real screens to style, rather than picking a palette in the abstract here.

## 11. Testing Expectations Relevant to Frontend

Per `TESTING_GUIDELINES.MD`: `hold_slot` gets stress-tested server-side with 10+ simultaneous requests where exactly one should win. The frontend's job is to handle the conflict response gracefully (slot taken, try another) as a normal path, not a crash case. Similarly, a booking confirmation screen should be safe to load twice (e.g. on refresh) without assuming it's the only time it'll run — payment confirmation is idempotent on the backend, the UI should be too.