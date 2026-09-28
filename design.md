# Khel.com — Frontend Design

Reference document for the three Next.js frontends in this repository. Migrations in
`supabase/migrations/` are the source of truth for the database; this document records
what the frontend is allowed to assume and what it must never invent.

## 1. Applications

Three independently deployable apps, each with its own origin, Supabase client, and
authentication flow.

| App | Path | Audience | Route guard |
| --- | --- | --- | --- |
| Customer | `apps/user` | Players browsing and booking courts | `/bookings`, `/profile` |
| Venue owner | `apps/venue-owner` | Businesses managing venues, courts, and slots | everything except `/sign-in`, `/join` |
| Admin | `apps/admin` | Platform operations and moderation | everything except `/sign-in` |

Cross-app navigation uses environment variables, never hardcoded hosts:

- `apps/user` reads `NEXT_PUBLIC_PARTNER_APP_URL` and `NEXT_PUBLIC_ADMIN_APP_URL`
- `apps/venue-owner` reads `NEXT_PUBLIC_USER_APP_URL`

`apps/user/src/lib/app-links.ts` rejects any value that is not an absolute `http(s)` URL,
so a misconfigured variable degrades to an in-app path instead of an open redirect.

## 2. Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4 with shadcn/ui primitives
- TanStack Query v5 for all server state
- `@supabase/ssr` for cookie-based sessions

### Next.js 16 notes

- The middleware file is `src/proxy.ts`, not `src/middleware.ts`. It is a UX gate only.
- Authorization is enforced by Postgres RLS. A user who bypasses the proxy still cannot
  read or write rows they are not entitled to.
- `next build` prerenders every page as static output. Auth is resolved in the browser by
  the shared auth provider, so no page requires a server session.

## 3. Data access rules

1. Every query is written against `src/lib/database.types.ts`, which mirrors the
   migrations by hand. Regenerating types from a live project is a separate task because
   `web/src/types/database.types.ts` is currently stale and still contains
   `courts.sport_id`, a column that does not exist.
2. No business data is hardcoded. Sports, prices, commission, search radius, hold
   duration, slots, and venue content all come from the database.
3. The only documented UI constants are `KARACHI_FALLBACK` (used when a customer denies
   geolocation) and the slot-conflict copy required by the `hold_slot` contract.
4. Platform-wide rules live in the `app_config` singleton and are read through
   `src/lib/app-config.ts` in all three apps, so the admin console can change them without
   a redeploy. The values there fall back to the column defaults in migration
   `20260925142542` when the row cannot be read.

### Columns that do not exist

These were requested or assumed at some point and must not be referenced:

- `courts.sport_id` — there is no `sports` table. Sport is the free-text `courts.sport_type`
  column, and every sport facet in the UI is derived from distinct values of that column.
- `venues.area_id` exists but there is no `areas` table, so area filtering is not offered.
- There is no `media` table. Venue photos are stored in `venues.amenities->'images'`, a JSON
  array of Cloudinary URLs. Boolean amenity flags share the same JSON object, so writes go
  through `withVenueImages()` in `src/lib/utils.ts` to avoid dropping either.
- There is no `reviews` table.

## 4. Auth and roles

`profiles.role` is the authorization source. Available values are `customer`,
`venue_owner`, `venue_staff`, `admin`, and `super_admin`.

- Signup is customer-only in `apps/user` and venue-owner-only in `apps/venue-owner`.
  `PublicSignupRole` in the type mirror reflects exactly that.
- The `trg_protect_profile_tier_and_role` trigger silently reverts unauthorized writes to
  `role` and `subscription_tier`. Customer and owner profile forms therefore do not offer
  those fields at all. Only `apps/admin` writes them, and only because the trigger permits
  platform admins.
- `venue_staff` is deliberately excluded from every screen. No RLS policy grants tenant
  access to staff, so a staff view would be non-functional and misleading.

## 5. Booking and slot holding

`hold_slot(p_court_id, p_date, p_start_time)` is the single source of truth for the
checkout timer. It returns `Array<{ slot_id, held_until }>`.

- The customer app keeps the selected public slot and the RPC hold result as separate
  state, so a hold response never mutates the venue's advertised slot list.
- The countdown is driven by `held_until` from the server, not by a client-computed TTL.
  There is no `HOLD_TTL_SECONDS` constant anywhere in the frontend.
- The three known RPC exceptions map to distinct UI: `not authenticated` prompts sign-in,
  a slot conflict shows the required "just taken" copy, and `freemium_limit_reached` opens
  the limit sheet.

### Payments are not implemented

`confirm_booking_with_payment(p_booking_id, p_gateway_ref, p_amount_paid)` is
webhook/admin-only, and no backend contract exists for initiating a payment or creating a
booking from a customer request. The customer app therefore stops at the hold and says so
plainly. Any UI that implied a completed purchase would be a lie about the backend.

## 6. Images

Uploads go through the `sign-cloudinary-upload` Edge Function using a signed upload
signature, never a hardcoded secret. The function returns a URL that is stored in
`venues.amenities.images`, capped at eight per venue.

The upload contract defines no deletion endpoint, so removing an image from the frontend
edits metadata only and leaves the Cloudinary asset in place. This is a known gap, not an
oversight in the UI.

## 7. Known backend handoffs

These are blocked on the backend and are surfaced in the UI as honest limitations rather
than hidden behind fake controls:

1. **Payment initiation and booking creation.** Blocks all checkout completion.
2. **`approved` → `published` transition.** Ownership of this transition is undecided, so
   the admin review queue stops at approval. `canTransitionVenue()` in
   `apps/admin/src/lib/queries.ts` is the single place the allowed transitions are
   declared.
3. **`venue_staff` RLS policies.** Blocks all staff-scoped screens.
4. **`sports` and `areas` tables.** Block normalized facets and area search.
5. **Media table and Cloudinary deletion.** Block image moderation and real removal.
6. **Stale hold cleanup.** No scheduled job releases abandoned holds. The customer UI
   treats an expired hold as a released slot and the RPC stays authoritative.
7. **`sports`/`areas`/`media` and stale generated types in `web/`.**

## 8. Validation

Each app exposes the same three scripts and all three must pass before a commit:

```bash
npm run lint
npm run typecheck
npm run build
```

`web/` is a retained React/Vite reference implementation. It is not part of the
deliverable and its generated types are known to be stale.
