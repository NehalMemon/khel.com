# Assigned Frontend Tasks: Khel.com

> Completed and shipped sections were removed: 1. Environment & Client Setup,
> 4. Booking Flow UI/UX, 5. Venue Owner Onboarding, 6. Venue Team Management,
> and 7. Minimum Admin Panel; in this round, 8. Notification System UI was
> completed and removed.

## Remaining

### 2. Safepay Widget Integration — BLOCKED (backend dependency)
- [ ] Wire the frontend checkout button to launch the Safepay widget using the public key.
- [ ] **CRITICAL:** Pass the active `booking_id` into the Safepay widget's `metadata` object during initialization. (Our Edge Function needs this metadata attached to the webhook to update the correct ledger entry.)

> **Blocker:** the Safepay browser SDK cannot attach `metadata` to a session, and a
> session `tracker`/`tbt` must be created server-side. This needs a Supabase Edge
> Function that creates the pending booking + Safepay session and returns the
> tracker to the client before the widget can launch. See `doc/Design_Backend.md` §6.

> **Backend note (notifications):** `notifications` table + RLS + `notification_type`
> enum exist (migration `20261015121301_admin_ram_and_notifications.sql`). Realtime
> must be enabled for `public.notifications` (if not already) for the bell to update
> on new inserts. Locally verify the table exists on your Supabase stack.
