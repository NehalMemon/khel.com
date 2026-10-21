# Assigned Frontend Tasks: Khel.com

# Assigned Frontend Tasks & UI/UX Architecture: Khel.com

> **AGENT CONTEXT INJECT (READ FIRST):** 
> We are migrating from a rigid Futsal booking system to a Universal Booking Engine that handles complex GameZones (Composite Inventory). 
> 
> **The Database Paradigm:** 
> We use an Adjacency List (`resources` table with `parent_id`). 
> - A "Flat Setup" (Open Hall): 4 PCs, 2 PS5s saved as individual rows (`parent_id = null`).
> - A "Nested Setup" (VIP Room): 1 Room (`parent_id = null`) containing 5 PCs (`parent_id = Room_ID`).
> 
> **The Concurrency Rule:** If a Parent (Room) is booked, all Children (PCs) are unavailable. If a Child (PC) is booked, its Parent (Room) is unavailable. We do NOT use a `slots` table. Availability is calculated dynamically: `Operating Hours - Active Bookings (by start/end time)`.

---

## 1. Customer UI: The Venue Storefront (Movie Theater Pattern)
**Goal:** Customers visiting a venue page must instantly see all services (Futsal, PC, Snooker) and their availability without clicking through individual assets.
- [ ] **Date Selector:** Place a prominent, horizontally scrollable date-picker at the top of the venue page (defaulting to Today). Limit advance days based on `venue.max_advance_booking_days`.
- [ ] **Category Grouping:** Group the UI by `resource.category` (e.g., "PlayStation 5", "VIP Rooms", "Futsal Pitches"). Do NOT list "PC 1", "PC 2", etc.
- [ ] **Dynamic Time Chips:** Under each category, render horizontal time chips (e.g., `[ 6:00 PM ]`). 
  - *Auto-Assignment Logic:* If a venue has 5 PCs, the "PC" category time chip at 8:00 PM remains clickable as long as `< 5` PCs are booked. The customer never selects the specific PC number.
  - *Selection:* Clicking a time chip opens a side-drawer or modal to finalize the duration and proceed to Safepay.

## 2. Owner UI: The Virtual Venue Designer (Configuration)
**Goal:** Owners need a visual way to build their inventory without filling out spreadsheets or typing JSON.
- [ ] **Resource Canvas (`/partner/resources`):** Create a visual list/grid. Allow the owner to click "Add Asset" (Flat setup) or "Add Room/Zone" (Nested setup).
- [ ] **Nesting UI:** If an owner creates a Room, they can click "Add Asset" *inside* that Room card. (Backend mapping: This assigns the `parent_id` of the assets to the Room's `id`).
- [ ] **Subscription Gating:** Lock advanced `metadata` features (like "Night Owl Pricing Packages" or "Duration Discounts") behind a UI badge that checks if `venue.subscription_tier === 'pro'`.

## 3. Owner UI: Live Timeline POS (Walk-in Management)
**Goal:** GameZone owners manage rapid walk-in traffic and need a bird's-eye view of their venue.
- [ ] **Gantt Chart View (`/partner/dashboard`):** Build a 2D timeline grid.
  - *Y-Axis:* List all resources hierarchically (Rooms, with dropdown toggles to show child PCs inside them).
  - *X-Axis:* Time of day, with a red vertical line indicating `now()`.
- [ ] **Instant Block Action:** Clicking any empty cell on this grid opens a rapid "Walk-in Block" modal, allowing the owner to instantly generate a booking record (blocking the time) without going through the Safepay flow.

## 4. Pending Edge Function Integrations (Carried Over)
- [ ] **Safepay Orchestration:** Call `supabase.functions.invoke('initiate-checkout')` before launching the Safepay widget. Pass the returned `tracker` and `tbt` tokens to the widget, and embed `booking_id` in the metadata.
- [ ] **Admin Approval:** In `/admin/applications`, wire the "Approve" button to invoke `supabase.functions.invoke('approve-venue')`.
- [ ] **Team Invites:** In `/partner/team`, wire the invite form to invoke `supabase.functions.invoke('invite-team-member')` with `email` and `permissions`.
- [ ] **Realtime Notifications:** Ensure the `NotificationProvider` is subscribed to `INSERT` events on the `notifications` table to drive the navbar bell badge.

## 5. Routing & Access Control (Carried Over)
- [ ] **Smart Redirects:** Route post-login traffic based on `profiles.role` (`admin` -> `/admin`, `venue_owner` -> `/partner`, `customer` -> `/`). Implement layout security guards in Next.js to block unauthorized URL access.


 Safepay Checkout Orchestration (UNBLOCKED)
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

## 6. Venue Partner Onboarding (Application Flow)
**Goal:** Replace the legacy "Owner Signup" flow. Venue owners must no longer be directly created in `auth.users`. They must fill out an application form that inserts into the `venue_applications` table, which the Admin will later review.

- [ ] **Route Refactor:** Deprecate the old `/partner/signup` page. Create a new public marketing page/form route (e.g., `/partner/apply` or `/list-your-venue`).
- [ ] **Application Form UI:** Build a clean, professional application form collecting only the required official data. 
  - *Fields Required:* Applicant Name, Email Address, Phone Number, Venue Name, Venue Physical Address.
  - *Optional Fields:* Primary Sport/Category (Futsal, E-Sports, Mixed), Brief Description.
- [ ] **Database Wiring:** Wire the form submission to insert directly into `public.venue_applications`. 
  - **CRITICAL:** Do NOT call `supabase.auth.signUp()`. The form simply pushes a row to the database with `status: 'pending'`.
- [ ] **Success UX:** Upon successful insertion, replace the form with a success state (e.g., "Application Received! Our team will review your venue details. Look out for an invitation email once approved.").
- [ ] **Auth Redirects:** Ensure the main "Login" screen removes any "Sign up as Venue Owner" buttons, replacing them with a "Partner with Us" link that routes to the new `/partner/apply` page.