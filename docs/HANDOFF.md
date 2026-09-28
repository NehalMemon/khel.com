# Backend to Frontend Handoff Protocol

This document establishes the official asynchronous communication and handoff protocol between the Backend and Frontend engineering teams for Khel.com. 

Whenever a backend feature, migration, or API service is completed, it must be documented here using the standard template below before the frontend begins implementation.

---

## Standard Feature Template

```markdown
## [Feature Name]

### Backend Status
- **Status:** [Planned | In Progress | Completed]
- **Branch / PR:** [Branch or PR reference]
- **Migrations / Functions:** [List of new migrations, tables, RPCs, or triggers]
- **Notes:** [Key architectural or security notes]

### Database API / Supabase Usage
- **Client Method:** [Exact Supabase client calls, e.g., supabase.from(...), supabase.rpc(...), supabase.auth.signUp(...)]
- **Expected Payload:** [TypeScript interface or JSON schema of expected arguments]
- **Response Format:** [Shape of returned data or generated types reference]
- **Permissions & RLS:** [Role access, e.g. customer, venue_owner, authenticated, anon]

### Frontend UI/UX Requirements
- **Target Components / Views:** [Where this feature lives in src/]
- **Required Inputs & Validations:** [Field validations, regex patterns, constraints]
- **State Handling:** [Loading, success, empty, and error states]
- **Edge Cases:** [Network retries, fallback handling, edge scenarios]
```

---

## User Authentication & Profile Synchronization

### Backend Status
- **Status:** Completed
- **Branch / PR:** `staging`
- **Migrations / Functions:**
  - Migration: `supabase/migrations/20260924112825_sync_auth_users_to_profiles.sql`
  - Function: `public.handle_new_user()` (`SECURITY DEFINER`, `SET search_path = public`)
  - Trigger: `on_auth_user_created` (`AFTER INSERT ON auth.users FOR EACH ROW`)
- **Notes:** The database now automatically provisions a row in `public.profiles` upon every new signup in `auth.users`. Handled with `ON CONFLICT (id) DO NOTHING` for idempotency and safe enum casting.

### Database API / Supabase Usage
- **Client Calls:** The frontend must **only** interact with Supabase Auth. **Do not** manually insert or upsert into `public.profiles`.
  ```typescript
  // 1. Sign Up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: trimmedName,
        phone: formattedPhone, // e.g. "+923001234567"
        role: role,            // optional: 'customer' (default) or 'venue_owner'
      }
    }
  });

  // 2. Sign In
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  ```
- **Payload Mapping in Trigger:**
  - `name`: Read from `options.data.name` (falls back to `'Unknown'` if null or empty).
  - `phone`: Read from `NEW.phone` or `options.data.phone`. If missing or empty, the trigger automatically assigns `'pending-' || NEW.id` to satisfy the `NOT NULL` and `UNIQUE` constraints without failing the signup transaction.
  - `role`: Read from `options.data.role`, validated against `public.user_role` enum (`'customer'`, `'venue_owner'`, `'venue_staff'`, `'admin'`, `'super_admin'`), defaulting to `'customer'`.
  - `avatar_url`: Read from `options.data.avatar_url` (nullable).
- **TypeScript Types:** Updated and synced in `web/src/types/database.types.ts`.

### Frontend UI/UX Requirements
- **Target Components / Views:**
  - `web/src/pages/auth/SignUp.tsx` (Customer signup)
  - `web/src/pages/PartnerJoin.tsx` (Venue partner registration)
  - `web/src/pages/auth/SignIn.tsx` (User login)
- **Required Inputs & Validations:**
  - **Full Name:** Required, non-empty, trimmed string.
  - **Phone Number:** 
    - Must be validated before form submission.
    - Pakistani format recommended: `^((\+92)|(0092)|(0))?3[0-9]{9}$` (e.g., `+923001234567` or `03001234567`). Normalize to E.164 format before sending.
  - **Password:** Minimum 8 characters with strength indicator.
  - **Role Specification:** Pass `role: 'venue_owner'` when signing up from the Partner Portal (`/partner/join`); default or pass `role: 'customer'` for marketplace users.
- **State Handling & Edge Cases:**
  - **Profile Completion Notice:** If a user signed up via an external provider or email without a phone number (i.e. their profile has `phone LIKE 'pending-%'`), prompt them with a banner/modal to complete their profile with a verified phone number before booking or listing venues.
  - **Duplicate Phone Error:** If a phone number is already registered to another user, display an explicit inline error: *"This phone number is already linked to an account."*

---

## [Feature] Secure Cloudinary Image Uploads
### Backend Status
Completed. Supabase Edge Function `sign-cloudinary-upload` is deployed locally. Cloudinary credentials are set in Supabase secrets.

### Database API / Supabase Usage
To upload an image, the frontend must execute a two-step process:
1. **Get Signature:** Call the edge function using the Supabase client:
   `const { data } = await supabase.functions.invoke('sign-cloudinary-upload', { body: { folder: 'venues' } })`
2. **Direct Upload:** POST the actual image file directly to Cloudinary's REST API (`https://api.cloudinary.com/v1_1/${data.cloud_name}/image/upload`).
   Attach a `FormData` object containing: `file`, `api_key`, `timestamp`, `signature`, and `folder`.

### Frontend UI/UX Requirements
- Build a reusable `<ImageUploader />` component in `src/components/ui/`.
- The component should handle file selection, trigger the two-step upload process, and display a loading spinner during the HTTP requests.
- Once Cloudinary returns a successful response, extract the `secure_url` and store it in your form state to ultimately be saved in our `venues` or `courts` Postgres tables.

---

## [Feature] Atomic Slot Holding with Freemium Quotas (Checkout Flow)
### Backend Status
- **Status:** Completed
- **Branch / PR:** `staging`
- **Migrations / Functions:**
  - Migration: `supabase/migrations/20260925123004_add_freemium_holds.sql`
  - Table Update: `public.profiles` (`subscription_tier TEXT NOT NULL DEFAULT 'free'` with check constraint `'free' | 'premium'`)
  - Table: `public.hold_logs` (`id`, `user_id`, `slot_id`, `created_at`) with RLS enabled
  - RPC: `public.hold_slot(p_court_id UUID, p_date DATE, p_start_time TIME)` (`SECURITY DEFINER`, `SET search_path = public`)
  - Security Trigger: `trg_protect_profile_tier_and_role` on `public.profiles` preventing unauthorized tier/role self-promotion
- **Notes:** High-concurrency race condition protection is strictly preserved by executing `SELECT ... FOR UPDATE SKIP LOCKED` on `public.slots` as Step 1. The subscription quota is verified subsequent to slot locking; if a free user has already held a slot within the last 7 days (`created_at > now() - interval '7 days'`), the transaction is aborted with `'freemium_limit_reached'`, automatically rolling back and releasing the slot lock. Premium users have unlimited holds.

### Database API / Supabase Usage
- **Client Method:**
  ```typescript
  const { data, error } = await supabase.rpc('hold_slot', {
    p_court_id: courtId,
    p_date: selectedDate, // 'YYYY-MM-DD'
    p_start_time: startTime, // 'HH:MM:SS'
  });
  ```
- **Expected Payload:**
  - `p_court_id`: `string` (UUID)
  - `p_date`: `string` (ISO Date: 'YYYY-MM-DD')
  - `p_start_time`: `string` (Time: 'HH:MM:SS')
- **Response Format:**
  - Returns `Array<{ slot_id: string, held_until: string }>` on success.
- **Error Exceptions Thrown:**
  - `'Slot is not available'`: The requested slot is already booked, currently held by an active session, or does not exist.
  - `'freemium_limit_reached'`: The authenticated user is on the `'free'` subscription tier and has already reached their limit of 1 slot hold per 7 days.
  - `'Not authenticated'`: The caller is not logged in.

### Frontend UI/UX Requirements
- **Target Components / Views:**
  - Checkout / Slot selection flow (e.g., `web/src/pages/VenueDetail.tsx` or booking modal).
- **Error Catching & Modal Trigger:**
  - The UI **must explicitly catch** the error message `'freemium_limit_reached'`.
  - When this error occurs, intercept it and **display an 'Upgrade to Premium' UI modal / paywall sheet** explaining that Free users can only hold 1 slot every 7 days, prompting them to upgrade to Premium for unlimited instant holds.
  - Do **not** display a generic alert or error toast for `'freemium_limit_reached'`.
- **Slot Unavailable Handling:**
  - Catch `'Slot is not available'` and display a real-time banner or alert indicating the slot was just snagged by another player.
- **Timer Handling:**
  - On success, use the returned `held_until` timestamp to drive the 5-minute checkout countdown timer.

---

## [Feature] Spatial Venue Discovery (Near Me)
### Backend Status
Completed. PostGIS RPC `search_venues_nearby` deployed with spatial indexing.

### Database API / Supabase Usage
To load the venue feed, the Next.js server component (or TanStack Query hook) must call:
`const { data, error } = await supabase.rpc('search_venues_nearby', { p_lat: userLat, p_lon: userLon, p_radius_km: 10 })`

### Frontend UI/UX Requirements
- Prompt the user for HTML5 Geolocation permissions on the Discover page.
- If denied, fallback to central Karachi coordinates (e.g., Lat: 24.8607, Lon: 67.0011) so the UI doesn't break.
- Provide a manual "Search by Area" dropdown (e.g., Clifton, Gulshan) for users who prefer not to share GPS data.
- Display the returned `distance_km` on the venue cards (e.g., '1.2 km away').

---

## [Feature] Platform Configuration
### Backend Status
- **Status:** Completed
- **Branch / PR:** `staging`
- **Migrations:** `supabase/migrations/20260925142542_create_app_config.sql`
- **Table:** `public.app_config` (Singleton table with `id = 1` constraint)
- **RLS:** Read-only for `anon` and `authenticated`; updates strictly restricted to verified platform admins via `public.is_admin()`. `INSERT` and `DELETE` remain completely blocked.

### Database API / Supabase Usage
On application initialization (or in a global React Context / TanStack Query provider), query the singleton configuration row:
```typescript
const { data: config, error } = await supabase
  .from('app_config')
  .select('commission_rate, default_search_radius_km, hold_expiry_minutes')
  .eq('id', 1)
  .single()
```

### Frontend UI/UX Requirements
- **Anti-Hardcoding Rule:** Do **not** hardcode business rules, search radiuses, or checkout countdown timers in components.
- **Search Radius:** Use `config.default_search_radius_km` (default: `10`) when querying `search_venues_nearby` or initializing the discover feed radius slider/dropdown.
- **Checkout Countdown:** Use `config.hold_expiry_minutes` (default: `5`) to dynamically drive the checkout hold expiration UI and warning notifications.
- **Commission Calculations:** Use `config.commission_rate` (default: `0.00`) for customer payment breakdowns and partner payout calculations.

---

## [Feature] Checkout & Payment Ledger
### Backend Status
Completed. The `confirm_booking_with_payment` RPC is deployed.

### Database API / Supabase Usage
**CRITICAL:** The frontend must NEVER call `confirm_booking_with_payment` directly. 
- The frontend is only responsible for initiating the payment session with the chosen payment gateway.
- Once the gateway succeeds, it will fire a server-to-server webhook to our Supabase Edge Function, which will securely call this RPC to finalize the ledger.

### Frontend UI/UX Requirements
- On the checkout page, after the payment gateway redirects the user back to Khel.com, query the `bookings` table for `payment_status`. 
- Show a loading spinner until `payment_status` changes to `'paid'`, then display the final confirmation receipt.



