# Assigned Backend Tasks: Khel.com

### Synchronization Audit - 2026-10-16
- [x] **Safepay Checkout Session Edge Function (`initiate-checkout`):**
  - Create a Supabase Edge Function to initiate checkout sessions for customers.
  - Must take `slot_id` from authenticated customer, verify slot hold validity, dynamically calculate `total_price` and commission via `app_config`, insert a `pending` booking in `bookings`, call Safepay API server-side with `metadata.booking_id`, and return `{ booking_id, tracker, tbt, amount }` to the frontend.
  - *Dependency:* Unblocks the frontend Safepay widget checkout flow.
- [ ] **Atomic Webhook Settlement via `confirm_booking_with_payment` RPC:**
  - Update `supabase/functions/safepay-webhook/index.ts` to call the PostgreSQL RPC `public.confirm_booking_with_payment(p_booking_id, p_gateway_ref, p_amount_paid)` instead of running a raw update against `bookings`.
  - Ensures dynamic commission snapshot, venue payout calculation, and atomic slot status updates to `booked` with concurrency locks (`FOR UPDATE`).
- [ ] **Enable Realtime on `public.notifications` Table:**
  - Create a new migration to execute `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`.
  - *Dependency:* Required for frontend notification bell dropdown to receive realtime notifications on insert.
- [x] **Partner Staff Invitation Edge Function (`invite-team-member`):**
  - Create an Edge Function allowing authenticated venue owners to invite staff (`role = 'venue_staff'`) to their venue via `auth.admin.inviteUserByEmail`.
  - Inserts the `venue_team` record with specified `permissions` (`view_bookings`, `edit_pricing`, etc.).
