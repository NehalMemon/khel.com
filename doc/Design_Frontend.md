# DESIGN_FRONTEND.md — Khel.com Frontend Specification

> This is the frontend half of the old `DESIGN.md`, split per team agreement (see `.agents/rules/team-workflow-rules.md`). This one is Abid's — follow it. The backend half, `DESIGN_BACKEND.md`, is advisory for Nehal only.
>
> Sources: `doc/ARCHITECTURE.md`, `doc/SCHEMA.md`, `doc/API_CONTRACTS.md`, the Backend→Frontend Handoff doc's "User Authentication & Profile Synchronization" entry, both `supabase/migrations/*.sql`, and the existing `web/` Vite proof-of-concept (kept as reference, not a base to build on — see prior notes on it).

## 0. Purpose & Scope

What to build for the Next.js frontend: the app split, the roles, the confirmed auth contract, the data shapes, the screens, and where the design system starts. `ARCHITECTURE.md` covers the *how* (RPC-driven, thin client); this covers the *what*.

## 1. Product Snapshot

Khel.com is an indoor sports venue/court booking marketplace for Karachi (futsal, badminton, etc.). Customers discover venues, book a court/time slot, and pay via digital wallet. Venue owners list and run their own venues. MVP commission is 0%, tracked rather than hardcoded.

## 2. Two Apps, Not Three Namespaces

Per the team's working rules, this is built as **two separate Next.js projects**, not one app with `/app` `/partner` `/admin` route groups:

- **User app** — customer marketplace *and* the venue partner portal, together (both are "regular" platform users authenticating the same way). Suggested routing, now that there's no need for an `/app` prefix to disambiguate from admin:
  - `/` , `/venues/[slug]`, `/bookings`, `/profile`, `/auth/sign-in`, `/auth/sign-up` — customer side
  - `/partner/join`, `/partner`, `/partner/courts`, `/partner/schedule`, `/partner/bookings` — partner side (matches the POC's existing partner routes)
- **Admin app** — a fully separate project, admin/super_admin only, routes at root level since the whole app is already admin-scoped (`/`, `/venues/review`, `/config`, `/bookings`).

**This split is my reading of "Frontend User and Frontend Admin, both completely separate" — worth a quick confirm before scaffolding, since it's the one structural assumption everything else in this doc builds on.** If "User" was meant to mean customer-only, with partner as a third thing, the screen inventory in §7 still holds, it just moves under a third project.

## 3. Roles → App → Access

| DB role (`profiles.role`) | App | What RLS grants today |
|---|---|---|
| `customer` | User | `SELECT` published venues/courts/slots; `SELECT`/`INSERT` own bookings |
| `venue_owner` | User (`/partner/*`) | Full CRUD on venues/courts/slots they own; `SELECT`/`UPDATE` on bookings tied to their venues |
| `venue_staff` | User (`/partner/*`) | Enum value exists; **no RLS policy grants it anything yet** beyond the universal own-profile rule. Don't build staff-specific UI until Nehal defines the boundary (`DESIGN_BACKEND.md` Open Items) |
| `admin` | Admin | `is_admin()` → bypasses tenant isolation, full access |
| `super_admin` | Admin | Same RLS as `admin` today. Reserve the UI distinction for platform-config actions once `app_config` exists |

**Nobody signs up as `admin` or `super_admin` through a public form.** See §5 for why this matters.

## 4. Data Model (plain language)

- **`profiles`** — extends `auth.users`. `name`, `phone` (unique, not null), `avatar_url`, `role`. Created automatically on signup — see §5, never write to this table directly from the frontend.
- **`venues`** — owned by a profile. `slug` (unique), `address`, `coordinates` (PostGIS point, for "near me" search), `amenities` (freeform `jsonb`), `status`: `draft → submitted → under_review → {approved → published | rejected}`, then `published ↔ suspended`/`archived`.
- **`courts`** — belongs to a venue. `name`, `sport_type` (free text — seed data uses `"Futsal"`, `"Badminton"`), `hourly_rate`, `metadata` (`jsonb`).
- **`slots`** — bookable inventory per court/date/time. `status`: `available → held (5 min, via hold_slot) → booked`, or `blocked`/`maintenance` set by the owner.
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
- **Slot:** `available → held (5 min TTL) → booked`, or `→ blocked`/`maintenance`. Nothing currently reverts an expired hold back to `available` — the UI should treat a `hold_slot` conflict (slot taken) as a normal, expected response, not an edge case.
- **Booking / payment:** two independent fields, see §4.

## 7. Screen Inventory

### User app — customer side (build from scratch)
1. **Discover** — browse/search published venues (area, sport type)
2. **Venue detail** — info, amenities, rating, courts list
3. **Slot picker** — date/time grid over `available` slots for a court
4. **Checkout** — `hold_slot` → 5-min countdown → payment Edge Function → wallet redirect
5. **Booking confirmation** — post-payment return, shows `booking_ref`
6. **My Bookings** — status + payment_status badges, cancel action
7. **Sign up / Sign in** — per §5's contract exactly
8. **Profile** — edit name/phone/avatar; shows the pending-phone banner when relevant

### User app — partner side (`/partner/*`)
| Screen | State in the `web/` POC |
|---|---|
| Join / sign in | Built, but rebuild per §5's confirmed contract (name+phone+role in `options.data`), not the POC's email-only version |
| Partner shell (nav: My Venue / Courts / Schedule / Bookings) | Built with inline hex styles — not a base to extend, see §10 |
| My Venue | Built (371 lines) — review before porting |
| Courts | Stub only — build: list/add/edit courts |
| Schedule | Stub only — build: generate/manage slots, bulk-generate, toggle blocked/maintenance |
| Bookings | Stub only — build: bookings for owned venues, mark no_show, payout figures |

### Admin app (nothing built yet)
1. **Sign in only — no public sign-up screen.** Admin accounts aren't self-service; see `DESIGN_BACKEND.md` §5 for the open question on how they're provisioned.
2. **Venue review queue** — `submitted`/`under_review` venues, approve/reject/publish
3. **Platform config** — CRUD over `app_config` once it exists (commission %, radius, slot duration, hold expiry)
4. **Bookings oversight** — platform-wide view

## 8. What the Frontend Can Call Today

| Capability | Status |
|---|---|
| `supabase.auth.signUp` / `signInWithPassword` | **Ready** — contract confirmed in §5 |
| Reads on `venues`/`courts`/`slots`/`bookings` per RLS in §3 | **Ready** |
| `hold_slot` RPC | **Not implemented yet** — build the checkout UI against the documented shape in `API_CONTRACTS.md`, but don't expect it to work until Nehal ships it |
| `confirm_booking_with_payment` RPC | **Not implemented yet**, and not client-callable anyway (webhook-only) |
| Payment initiation | **No Edge Function yet**, gateway not chosen |

## 9. Build Notes for the Next.js Port

- **TanStack Query is mandatory** for every read/write, per `ARCHITECTURE.md` — the POC used raw `useEffect`, don't carry that forward.
- **Supabase client split**: browser client + server client via `@supabase/ssr`, since Next.js needs SSR-safe cookie-based sessions (the POC's single browser-only client won't work here).
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (replacing the POC's `VITE_` prefix).
- **Components**: shadcn/ui in both apps (`npx shadcn@latest init`, Tailwind v4, CSS-first config — no `tailwind.config.js`). Install and configure it as part of scaffolding rather than leaving it for later.
- **Types**: `web/src/types/database.types.ts` already matches the current schema — copy it into each app and regenerate with `supabase gen types typescript` after future migrations, don't hand-edit it.
- Per the existing `.agents/rules/frontend-rules.md`: no `any` types, shared UI lives in `components/ui/`, no hardcoded business rules (commission/radius/durations come from `app_config` once it exists).

## 10. Design System Starting Point

The POC's `Button`/`Alert`/`Spinner` hardcode hex colors inline — fine for a connectivity spike, not for the real build. With shadcn/ui now in the picture:

- shadcn's own variant pattern (via `class-variance-authority`) replaces the POC's manual `switch` statements — keep the same *names* though, since they're already sensible: `Button(primary|secondary|outline|danger)` → shadcn's `default|secondary|outline|destructive`; `Alert(error|warning|info|success)`.
- Theme shadcn's CSS variables deliberately for khel.com rather than leaving the default zinc/neutral base color — worth a short, focused pass once there are real screens to style, rather than picking a palette in the abstract here.

## 11. Testing Expectations Relevant to Frontend

Per `TESTING_GUIDELINES.MD`: `hold_slot` gets stress-tested server-side with 10+ simultaneous requests where exactly one should win. The frontend's job is to handle the conflict response gracefully (slot taken, try another) as a normal path, not a crash case. Similarly, a booking confirmation screen should be safe to load twice (e.g. on refresh) without assuming it's the only time it'll run — payment confirmation is idempotent on the backend, the UI should be too.