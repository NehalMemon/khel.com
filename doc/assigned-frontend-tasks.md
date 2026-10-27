# Assigned Frontend Tasks: Khel.com

> **AGENT CONTEXT INJECT (READ FIRST):**
> We are migrating from a rigid Futsal booking system to a Universal Booking Engine that handles complex GameZones (Composite Inventory).
>
> **The Database Paradigm:**
> We use an Adjacency List (`resources` table with `parent_id`).
> - A "Flat Setup" (Open Hall): 4 PCs, 2 PS5s saved as individual rows (`parent_id = null`).
> - A "Nested Setup" (VIP Room): 1 Room (`parent_id = null`) containing 5 PCs (`parent_id = Room_ID`).
>
> **The Concurrency Rule:** If a Parent (Room) is booked, all Children (PCs) are unavailable. If a Child (PC) is booked, its Parent (Room) is unavailable. Availability is calculated dynamically: `Operating Hours - Active Bookings (by start/end time)`.

---

## Status

All frontend-actionable tasks below are **complete**. The only open items are backend
dependencies, listed under "Blocked (not frontend-actionable)".

Task 7 (partner onboarding) is implemented; its *optional* fields (sport/category,
description) are the one sub-item waiting on backend columns, see Blocked §3.

---

## 1. Customer UI: The Venue Storefront (Movie Theater Pattern) — DONE
**Goal:** Customers visiting a venue page must instantly see all services (Futsal, PC, Snooker) and their availability without clicking through individual assets.
- [x] **Date Selector:** Place a prominent, horizontally scrollable date-picker at the top of the venue page (defaulting to Today). Limit advance days based on `venue.max_advance_booking_days`.
- [x] **Category Grouping:** Group the UI by `resource.category` (e.g., "PlayStation 5", "VIP Rooms", "Futsal Pitches"). Do NOT list "PC 1", "PC 2", etc.
- [x] **Dynamic Time Chips:** Under each category, render horizontal time chips (e.g., `[ 6:00 PM ]`).
  - [x] *Auto-Assignment Logic:* If a venue has 5 PCs, the "PC" category time chip at 8:00 PM remains clickable as long as `< 5` PCs are booked. The customer never selects the specific PC number.
  - [x] *Selection:* Clicking a time chip opens a side-drawer or modal to finalize the duration and proceed to Safepay.

> Implemented in `frontend/src/components/booking/venue-detail-page.tsx` (scrollable date
> strip capped by `max_advance_booking_days`, default 14; category-grouped cards with
> aggregated time chips showing `n/m free`; Sheet drawer → hold → `HoldCountdown` +
> `SafepayCheckoutButton`).

## 2. Owner UI: The Virtual Venue Designer (Configuration) — DONE
**Goal:** Owners need a visual way to build their inventory without filling out spreadsheets or typing JSON.
- [x] **Resource Canvas (`/partner/resources`):** Create a visual list/grid. Allow the owner to click "Add Asset" (Flat setup) or "Add Room/Zone" (Nested setup).
- [x] **Nesting UI:** If an owner creates a Room, they can click "Add Asset" *inside* that Room card. (Backend mapping: This assigns the `parent_id` of the assets to the Room's `id`).
- [x] **Subscription Gating:** Lock advanced `metadata` features (like "Night Owl Pricing Packages" or "Duration Discounts") behind a UI badge that checks if `venue.subscription_tier === 'pro'`.

> Implemented in `frontend/src/components/partner/partner-resources-page.tsx` +
> `resource-designer.tsx` (two-level tree, Add Asset / Add Room-Zone, nest-inside,
> Pro-gated `metadata.capacity` / `metadata.booking_model` with a locked overlay and a
> "Pro tools locked" badge, cascading delete confirm).
> Route: `frontend/src/app/(partner)/partner/(portal)/resources/page.tsx`.

## 3. Owner UI: Live Timeline POS (Walk-in Management) — DONE
**Goal:** GameZone owners manage rapid walk-in traffic and need a bird's-eye view of their venue.
- [x] **Gantt Chart View (`/partner/dashboard`):** Build a 2D timeline grid.
  - [x] *Y-Axis:* List all resources hierarchically (Rooms, with dropdown toggles to show child PCs inside them).
  - [x] *X-Axis:* Time of day, with a red vertical line indicating `now()`.
- [x] **Instant Block Action:** Clicking any empty cell on this grid opens a rapid "Walk-in Block" modal, allowing the owner to instantly generate a booking record (blocking the time) without going through the Safepay flow.

> Implemented in `frontend/src/components/partner/partner-timeline-page.tsx` +
> `venue-timeline.tsx` (hour columns 6:00–24:00, hierarchical Y rows where containers
> expand to their nested assets, booking blocks positioned by start/end, per-row red
> now-line refreshed every 60s, click-empty-cell walk-in Sheet →
> `useCreateWalkInBookingMutation`). Route:
> `frontend/src/app/(partner)/partner/(portal)/dashboard/page.tsx`.

## 4. Edge Function Integrations — DONE
- [x] **Safepay Orchestration:** Call `supabase.functions.invoke('initiate-checkout')` before launching the Safepay widget. Pass the returned `tracker` and `tbt` tokens to the widget.
  - NOTE: the `booking_id` → `metadata` step is backend-owned, see Blocked below.
- [x] **Admin Approval:** In `/admin/applications`, wire the "Approve" button to invoke `supabase.functions.invoke('approve-venue')`.
- [x] **Team Invites:** In `/partner/team`, wire the invite form to invoke `supabase.functions.invoke('invite-team-member')` with `email` and `permissions`.
- [x] **Realtime Notifications:** Ensure the `NotificationProvider` is subscribed to `INSERT` events on the `notifications` table to drive the navbar bell badge.

> Implemented in `frontend/src/lib/queries/checkout.ts` +
> `frontend/src/components/booking/safepay-checkout-button.tsx` (widget),
> `frontend/src/lib/queries/admin.ts` → `use-admin-data.ts` →
> `frontend/src/components/admin/applications-page.tsx` (approve),
> `frontend/src/lib/queries/partner.ts` → `use-partner-data.ts` →
> `frontend/src/components/partner/team-dashboard.tsx` (invite), and
> `frontend/src/components/app/notification-provider.tsx` (channel `notifications:<userId>`,
> `INSERT` filtered by `user_id`).

## 5. Routing & Access Control — DONE
- [x] **Smart Redirects:** Route post-login traffic based on `profiles.role` (`admin` -> `/admin`, `venue_owner` -> `/partner`, `customer` -> `/`). Implement layout security guards in Next.js to block unauthorized URL access.
- [x] **Layout Security Guards:** Admin guard via `(admin)/admin/(console)/layout.tsx` (keeps `/admin/sign-in` reachable as a sibling) and partner guard in `(partner)/partner/(portal)/layout.tsx`.
- [x] **Dynamic Navigation:** Update the main Navbar to conditionally render role-specific quick links ("Admin Panel", "Owner Dashboard", or "My Bookings").

> Implemented in `frontend/src/lib/auth-server.ts` (`getServerViewer`, `isAdminRole`,
> `isPartnerRole`), the two layouts above, `frontend/src/lib/auth.ts`
> (`homePathForRole()`), and `frontend/src/components/app/site-header.tsx`
> (`workspaceLink(role)`).

## 6. UI/UX Improvements: Booking Flow — DONE
- [x] **Clean URLs (State Management):** Refactor the booking page to manage the selected `courtId`/`resourceId` and `date` using internal React State (Context) instead of appending long UUIDs to URL query parameters.
- [x] **Auto-Load Defaults:** Automatically select the first available resource by default and auto-load slots for `today` to prevent the "empty screen" effect on initial load.

> Implemented in `frontend/src/components/booking/booking-selection-provider.tsx`
> (holds `courtId`/`date`/`slotId` in context; the `/venues/[slug]/book` route declares no
> `searchParams`) and `frontend/src/components/booking/booking-flow.tsx` (date defaults to
> today, court falls back to the first court with a free slot, saved storefront showtime is
> re-selected).

## 7. Venue Partner Onboarding (Application Flow) — DONE
**Goal:** Replace the legacy "Owner Signup" flow. Venue owners must no longer be directly created in `auth.users`. They must fill out an application form that inserts into the `venue_applications` table, which the Admin will later review.

- [x] **Route Refactor:** Deprecate the old `/partner/signup` page. Create a new public marketing page/form route (e.g., `/partner/apply` or `/list-your-venue`).
- [x] **Application Form UI:** Build a clean, professional application form collecting only the required official data.
  - *Fields Required:* Applicant Name, Email Address, Phone Number, Venue Name, Venue Physical Address.
  - [ ] *Optional Fields:* Primary Sport/Category (Futsal, E-Sports, Mixed), Brief Description. **Blocked on backend columns — see Blocked §3.**
- [x] **Database Wiring:** Wire the form submission to insert directly into `public.venue_applications`.
  - **CRITICAL:** Do NOT call `supabase.auth.signUp()`. The form simply pushes a row to the database with `status: 'pending'`.
- [x] **Success UX:** Upon successful insertion, replace the form with a success state (e.g., "Application Received! Our team will review your venue details. Look out for an invitation email once approved.").
- [x] **Auth Redirects:** Ensure the main "Login" screen removes any "Sign up as Venue Owner" buttons, replacing them with a "Partner with Us" link that routes to the new `/partner/apply` page.

> Implemented in `frontend/src/app/(partner)/partner/apply/page.tsx` +
> `frontend/src/components/partner/venue-application-form.tsx` (required fields,
> PK phone normalization, inline validation, success state), wired through
> `frontend/src/lib/queries/applications.ts` → `frontend/src/hooks/use-applications.ts`.
> The legacy `/partner/join` self-service signup now `redirect()`s to
> `/partner/apply`, `signUpVenueOwner` was removed from `frontend/src/lib/auth.ts`,
> and every "list your venue"/partner CTA now points at `/partner/apply`
> (`site-footer`, customer sign-in/sign-up, partner sign-in).
> Admin review/approve lives at `/admin/applications` via the `approve-venue`
> Edge Function.
## 1. Location-Based Search (PostGIS)
**Priority:** HIGH — Core discovery feature for customers.
**Goal:** Allow customers to discover nearby Futsal and GameZone venues based on their current geographic location.
- [ ] **Geolocation Prompt:** On the `/venues` or home page, request browser location permissions (`navigator.geolocation.getCurrentPosition`).
- [ ] **RPC Query:** If location is granted, query the existing spatial function: `supabase.rpc('search_venues_nearby', { p_lat: latitude, p_lon: longitude, p_radius_km: 15 })`.
- [ ] **Fallback:** If location access is denied, default to fetching venues via standard `SELECT` sorted by `created_at` or `avg_rating`.

---

## Blocked (not frontend-actionable)

### Safepay `booking_id` metadata — BLOCKED (backend dependency)
> The Safepay browser SDK has no `metadata` prop. The `metadata.booking_id` is attached
> by the `initiate-checkout` Edge Function server-side when it creates the tracker, not
> by the client widget. The frontend already passes the returned `tracker`/`tbt` to the
> widget. See `doc/Design_Backend.md` §6.

### 2. Realtime on `public.notifications` — BLOCKED (backend dependency)
> **Backend note (notifications):** `notifications` table + RLS + `notification_type`
> enum exist (migration `20261015121301_admin_ram_and_notifications.sql`). Realtime
> must be enabled for `public.notifications` (if not already) for the bell to update on
> new inserts. The frontend subscription is already in place
> (`notification-provider.tsx`).

### 3. Optional partner-application fields — BLOCKED (backend schema)
- [ ] *Optional Fields:* Primary Sport/Category and Brief Description on the
  `/partner/apply` form.

> **Blocker:** `public.venue_applications` (migration
> `20261015114427_create_venue_applications.sql`) only defines the five required
> columns. The frontend will not write applicant text into admin-owned
> `admin_notes`, so these fields stay off the form until the backend adds
> `primary_category` / `description` (or `metadata jsonb`) and regenerates
> `frontend/src/types/database.types.ts`. See `doc/Design_Backend.md` §7 item 6.


### Realtime on `public.notifications` — BLOCKED (backend dependency)
> `notifications` table + RLS + `notification_type` enum exist (migration
> `20261015121301_admin_ram_and_notifications.sql`). Realtime must be enabled for
> `public.notifications` (if not already) for the bell to update on new inserts. The
> frontend subscription is already in place (`notification-provider.tsx`).