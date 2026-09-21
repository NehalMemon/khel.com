# Database & RLS Blueprint (`SCHEMA.md`)

## 1. Overview & Extensions
- **Database Engine:** PostgreSQL (hosted on Supabase).
- **Required Extensions:** `postgis` (mandatory for spatial queries like `ST_DWithin` for venue discovery).
- **Security Baseline:** Row Level Security (RLS) enabled on *every* table. Default-deny posture.

---

## 2. Global Enums
- `user_role`: `'customer'`, `'venue_owner'`, `'venue_staff'`, `'admin'`, `'super_admin'`
- `venue_status`: `'draft'`, `'submitted'`, `'under_review'`, `'approved'`, `'published'`, `'rejected'`, `'suspended'`, `'archived'`
- `slot_status`: `'available'`, `'held'`, `'booked'`, `'blocked'`
- `booking_status`: `'confirmed'`, `'completed'`, `'cancelled_by_customer'`, `'cancelled_by_venue'`, `'no_show'`
- `payment_status`: `'pending'`, `'paid'`, `'failed'`, `'refunded'`
- `media_status`: `'pending'`, `'approved'`, `'rejected'`

---

## 3. Core Tables

### `profiles`
Extends Supabase `auth.users`.
- `id` (uuid, PK, references `auth.users.id`)
- `name` (text, not null)
- `phone` (text, unique, not null)
- `avatar_url` (text, nullable)
- `role` (user_role, default `'customer'`)
- `created_at`, `updated_at` (timestamptz)

### `venues`
- `id` (uuid, PK)
- `owner_id` (uuid, references `profiles.id`)
- `name` (text, not null)
- `slug` (text, unique, not null)
- `description` (text)
- `address` (text, not null)
- `coordinates` (geography(Point, 4326), not null) — *PostGIS spatial point*
- `area_id` (uuid, references `areas.id`)
- `status` (venue_status, default `'draft'`)
- `avg_rating` (numeric, default 0.0)
- `created_at`, `updated_at` (timestamptz)

### `courts`
- `id` (uuid, PK)
- `venue_id` (uuid, references `venues.id`, cascade delete)
- `sport_id` (uuid, references `sports.id`)
- `name` (text, not null) — e.g., "Court 1"
- `created_at`, `updated_at` (timestamptz)

### `slots`
Pre-generated bookable inventory.
- `id` (uuid, PK)
- `court_id` (uuid, references `courts.id`, cascade delete)
- `date` (date, not null)
- `start_time` (time, not null)
- `end_time` (time, not null)
- `status` (slot_status, default `'available'`)
- `held_by` (uuid, references `profiles.id`, nullable)
- `held_until` (timestamptz, nullable)
- *Constraint:* Unique index on `(court_id, date, start_time)` to prevent duplicate inventory.

### `bookings`
Stores confirmed reservations and tracks digital wallet transactions (0% commission pass-through model for MVP).
- `id` (uuid, PK)
- `booking_ref` (text, unique, not null) — human readable, e.g., `ISB-7F3K2`
- `customer_id` (uuid, references `profiles.id`)
- `venue_id` (uuid, references `venues.id`)
- `court_id` (uuid, references `courts.id`)
- `status` (booking_status, default `'confirmed'`)
- **Payment & Payout Tracking Columns (MVP Digital Wallet Integration):**
  - `payment_status` (payment_status, default `'pending'`)
  - `payment_gateway_ref` (text, nullable) — transaction ID from wallet aggregator
  - `total_charged` (numeric, not null) — total amount paid by customer via digital wallet
  - `venue_payout_amount` (numeric, not null) — amount owed/routed to venue owner (equals `total_charged` during MVP due to 0% commission)
  - `commission_amount_snapshot` (numeric, default 0.00) — explicitly tracked as 0 for MVP history
- `created_at`, `updated_at` (timestamptz)

---

## 4. Row Level Security (RLS) Policy Summary
1. **`profiles`:** Users can read/update their own profile; admins can read all.
2. **`venues`:** Anonymous/Customers can read rows where `status = 'published'`. Owners/Staff can read/write their own venue.
3. **`slots`:** Public read for published venues; writes strictly restricted to system jobs and atomic RPC functions.
4. **`bookings`:** Customers can read/insert their own bookings via secure RPCs; Venue owners/staff can read bookings tied to their venue.