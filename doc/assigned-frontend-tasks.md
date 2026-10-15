# Assigned Frontend Tasks: Khel.com

## Current Focus: Safepay Checkout Integration & Environment Setup

### 1. Environment & Client Setup
- [ ] Create `.env.local` in the `frontend` directory.
- [ ] Add the local backend and payment keys:
  - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_local_anon_key>`
  - `NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY=<your_safepay_public_key>`
- [ ] Initialize the Supabase client using the generated `frontend/src/types/database.types.ts` to ensure strict typing.

### 2. Safepay Widget Integration
- [ ] Wire the frontend checkout button to launch the Safepay widget using the public key.
- [ ] **CRITICAL:** Pass the active `booking_id` into the Safepay widget's `metadata` object during initialization. (Our Edge Function needs this metadata attached to the webhook to update the correct ledger entry).


### 4. UI/UX Improvements: Booking Flow
- [ ] **Clean URLs (State Management):** Refactor the booking page to manage the selected `courtId` and `date` using internal React State (e.g., `useState`, Context, or Zustand) instead of appending the long UUIDs to the URL query parameters. This will make the URLs much cleaner for users.
- [ ] **Auto-Load Defaults:** Prevent the "empty screen" effect when a user first lands on the booking page. Automatically select the first available court by default and auto-load the slots for `today` so the user is immediately presented with clickable time slots.



### 6. Venue Team Management (RAM)
- [ ] **Team Dashboard (`/owner/team`):** Build a page in the Venue Owner dashboard to list all current team members and their assigned permissions by querying the `venue_team` table combined with the `profiles` table.
- [ ] **Invite Team Member Modal:** Create a form that takes an `email` and a set of `permissions` (e.g., checkboxes for "View Bookings", "Edit Pricing"). For now, just build the UI; we will wire this up to a Supabase Edge Function later to handle the secure invitation and account creation process.


### 5. Venue Owner Onboarding Flow
- [ ] **Partner Landing Page (`/partner`):** Build a public-facing landing page explaining the benefits of listing a venue on Khel.com.
- [ ] **Application Form (`/partner/apply`):** Create a form that collects `applicant_name`, `email`, `phone`, `venue_name`, and `venue_address`. On submit, insert this data directly into the `venue_applications` table. Show a success screen stating: "Your application is under review. Our team will contact you shortly."
- [ ] **Admin Dashboard View (`/admin/applications`):** Build a protected admin route that fetches rows from `venue_applications` where `status === 'pending'`. Include UI buttons to "Approve" or "Reject" (API integration for approval will come later).