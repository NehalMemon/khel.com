# Assigned Frontend Tasks: Khel.com

All assigned frontend tasks are complete.

The only open item (Safepay widget integration) is blocked by backend and cannot be completed on the frontend alone. See the blocker note below for details.

## Blocked (not frontend-actionable)
### 2. Safepay Widget Integration - BLOCKED (backend dependency)
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
