# Assigned Frontend Tasks: Khel.com

## 1. Safepay Checkout Orchestration (UNBLOCKED)
- [ ] **Invoke Checkout Edge Function:** Before launching the Safepay widget, the frontend must call `supabase.functions.invoke('initiate-checkout', { body: { slot_id } })`. 
- [ ] **Launch Widget:** Use the `tracker` token returned from the Edge Function to initialize the Safepay client-side widget.
- [ ] **Pass Metadata:** Ensure `booking_id` (returned from the Edge Function) is passed into the Safepay widget's metadata object so the webhook can identify the transaction.

## 2. Role-Based Routing & Access Control
- [ ] **Smart Login Redirect:** Update the authentication flow to fetch `profiles.role` post-login. Route `admin` -> `/admin`, `venue_owner` -> `/partner/overview`, and `customer` -> `/`.
- [ ] **Layout Security Guards:** Create `(admin)/admin/layout.tsx` and `(partner)/partner/(portal)/layout.tsx`. These layouts must fetch the user profile server-side and trigger a `redirect('/')` if the role does not match the required clearance.
- [ ] **Dynamic Navigation:** Update the main Navbar to conditionally render role-specific quick links ("Admin Panel", "Owner Dashboard", or "My Bookings").

## 3. Dashboard Enhancements (Edge Function Wiring)
- [ ] **Venue Application Review:** In `src/components/admin/applications-page.tsx`, update the UI to fetch pending applications. Wire the approval button to invoke `supabase.functions.invoke('approve-venue', { body: { application_id } })` instead of directly mutating the table. Handle loading states and display success/error feedback.
- [ ] **Connect Team Member Invitations:** In `src/components/partner/team-dashboard.tsx`, wire `handleInvite` to invoke the now-live `invite-team-member` Edge Function, passing the staff member's `email` and `permissions` array. Handle success/error states.

## 4. Realtime Notification UI
- [ ] **Realtime Provider:** Ensure the `NotificationProvider` is utilizing `supabase.channel('custom-insert-channel').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {...}).subscribe()`.
- [ ] **Header Bell Icon:** Maintain the unread badge counter in the main navbar and route users to the `action_link` upon click.

## 5. UI/UX Improvements: Booking Flow
- [ ] **Clean URLs (State Management):** Refactor the booking page to manage the selected `courtId` and `date` using internal React State (e.g., `useState`, Context, or Zustand) instead of appending long UUIDs to URL query parameters.
- [ ] **Auto-Load Defaults:** Automatically select the first available court by default and auto-load slots for `today` to prevent the "empty screen" effect on initial load.