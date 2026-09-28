# DESIGN_BACKEND.md — Backend Reference Notes

> This is the backend half of the old `DESIGN.md`, split out so it doesn't mix into Abid's frontend spec. **This file is reference material, not a spec Nehal is bound to.** It exists so backend and frontend can see what the other is assuming, per `.agents/rules/team-workflow-rules.md`. Use whatever parts are useful; the actual source of truth for what's implemented is always the migrations themselves.

## 1. Schema Snapshot

Full detail lives in `doc/SCHEMA.md` and the migrations — this is just an index of what the frontend is building against: `profiles` (extends `auth.users`, has `role`), `venues` (owned by a profile, has a `draft → published` status pipeline), `courts` (belongs to a venue), `slots` (belongs to a court, has the hold mechanism), `bookings` (references customer/venue/court/slot, tracks both `status` and `payment_status` plus the payout ledger columns).

## 2. RLS Summary

Current policies (from `20260922122101_multi_tenant_and_wallet_updates.sql`, which supersedes the initial migration): `is_admin()` bypasses tenant isolation everywhere; customers get read access to `published` venues/courts/slots and read/insert on their own bookings; venue owners get full CRUD scoped to venues where `owner_id = auth.uid()` (and courts/slots/bookings that trace back to those venues). `venue_staff` has no policy of its own yet — see §5.

## 3. RPC Contracts

Original status (2026-09-25), kept for the record — **both have since shipped**, see §5:

Documented in `doc/API_CONTRACTS.md`, not yet present in any migration:

- **`hold_slot(p_court_id, p_date, p_start_time)`** — `SECURITY DEFINER`, atomic `UPDATE slots SET status='held', held_by=auth.uid(), held_until=now()+interval '5 minutes' WHERE id=target AND status='available' RETURNING *`. **Shipped** in `20260925123004_add_freemium_holds.sql`; returns `Array<{ slot_id, held_until }>` and raises `freemium_limit_reached` for free accounts.
- **`confirm_booking_with_payment(p_slot_id, p_customer_id, p_gateway_ref, p_amount_paid)`** — webhook-only (never called directly by a client). Validates the slot is `held` by that customer, inserts the `bookings` row (`payment_status='paid'`, `commission_amount_snapshot=0`), sets the slot to `booked`. **Shipped** in `20260925143557_create_booking_ledger_rpc.sql`, but with a different signature: `confirm_booking_with_payment(p_booking_id, p_gateway_ref, p_amount_paid)`. It expects a booking that already exists, which is why booking *creation* is still an open item (§5 item 8).

## 4. Completed: Auth → Profile Sync

Already shipped (per the Backend→Frontend Handoff doc, `staging` branch): migration `20260924112825_sync_auth_users_to_profiles.sql`, function `handle_new_user()` (`SECURITY DEFINER`, `search_path=public`), trigger `on_auth_user_created` (`AFTER INSERT ON auth.users`). Idempotent via `ON CONFLICT (id) DO NOTHING`. Frontend contract for this is fully documented in `DESIGN_FRONTEND.md` §5 — noting it here just so this file is a complete picture of backend state.

## 5. Open Items / Requests From Frontend

> **Status refresh 2026-09-28**, checked against the migrations actually present in
> `supabase/migrations/`. Items 1 and 2 in the original list have since shipped; the rest are
> still open. Frontend has not worked around any of these by faking UI.

**Worth flagging first, not because it's frontend's call to make, but because it changes what "done" means for the auth trigger above:** the handoff doc describes `role` as being validated *against the `user_role` enum*, i.e. that the value is one of the five legal roles — it doesn't say self-service signup is *restricted* to a subset of those roles (like `customer`/`venue_owner` only). If that's accurate as written, a direct API call (not going through any frontend form) could pass `role: 'admin'` or `role: 'super_admin'` in `signUp`'s `options.data` and get provisioned as one. The frontend will never expose that choice, but that alone doesn't prevent it being called directly. Worth a two-minute check — if the trigger already restricts self-service role assignment to non-privileged roles, great, nothing to do; if not, probably wants tightening (e.g. only allow `customer`/`venue_owner` through the trigger, provision `admin`/`super_admin` some other way — direct DB action, a separate internal-only path, etc.) before the admin app ships.

**Frontend-side mitigation already in place (not a substitute for the above):** the user app's `PublicSignupRole` is narrowed to `"customer"` and the venue-owner app hardcodes `venue_owner`, so neither shipped app can request a privileged role even if its form were modified.

### Resolved since this file was first written

1. ~~**`app_config` table**~~ — **shipped** in `20260925142542_create_app_config.sql`, with an `admin_update_app_config` policy scoped to `is_admin()`. All three apps read it at runtime; the admin console edits it. `DESIGN_FRONTEND.md` §8 updated.
2. ~~**`hold_slot`~~ — **shipped** in `20260925123004_add_freemium_holds.sql`, returning `Array<{ slot_id, held_until }>` alongside a new `hold_logs` table and `profiles.subscription_tier`. It raises `freemium_limit_reached` for free accounts, which the customer app surfaces as a limit sheet.
   *Note: `DESIGN_FRONTEND.md` §8 and `API_CONTRACTS.md` described `hold_slot` and `confirm_booking_with_payment` as unimplemented and gave the signature `p_slot_id`/`p_customer_id`. The shipped functions take `p_booking_id`/`p_gateway_ref`/`p_amount_paid` and `p_court_id`/`p_date`/`p_start_time` respectively, so `API_CONTRACTS.md` still needs a reconciliation pass by its owner.*

### Still open

3. **Stale-hold cleanup** — nothing currently reverts an expired `held` slot back to `available` (cron job / scheduled Edge Function / check-on-read — whichever fits). The customer app treats a hold conflict as a normal response and shows held slots with their `held_until` in the owner portal, but the row stays `held` until something cleans it.
4. **`approved → published`** venue transition — not documented who/what triggers it. The admin review queue stops at approval and the button is disabled; the allowed transitions are declared once in `apps/admin/src/lib/queries.ts` (`canTransitionVenue`).
5. **`venue_staff`** — enum value exists, no RLS policy defined. Every screen deliberately excludes staff; the admin "Venue owners" page says why.
6. **Admin account provisioning** — given the point above, how does the first `super_admin` get created, and how are subsequent `admin` accounts added? Not self-service, so needs *some* documented path. The admin app has sign-in only and no public signup.
7. **Payment gateway** — not chosen yet; the webhook payload shape in `API_CONTRACTS.md` is provisional. **This is the only thing blocking checkout completion**, together with item 8.
8. **Booking creation from a customer request** — `confirm_booking_with_payment(p_booking_id, ...)` is webhook/admin-only and expects a booking that already exists. There is no client-callable contract that creates one, so the customer app has no safe path past the hold. A new RPC (keeping the "one primary state mutation" rule in `.agents/rules/coding-rules.md` §5) is needed.
9. **Refund flow** — `payment_status = 'refunded'` exists as a state with no process behind it yet. The admin console can filter and display it but not initiate it.
10. **`booking_ref` prefix** — `SCHEMA.md` shows `KHEL-7F3K2`, `API_CONTRACTS.md` shows `ISB-9X2P` (likely a leftover from an earlier working name). `KHEL-` looks like the intended one.
11. **`web/src/types/database.types.ts` is stale** — it declared a `courts.sport_id` column that no migration ever creates. The frontend has removed those entries and the three app mirrors are now the maintained source of truth, but the file is the one the `/audit` workflow still points at, so it will drift again unless it is either regenerated or retired.