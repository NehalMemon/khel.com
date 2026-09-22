# Database & RLS Blueprint (Khel.com)

## 1. Overview & Extensions
- **Database Engine:** PostgreSQL (hosted on Supabase).
- **Required Extensions:** `postgis` (mandatory for spatial queries like `ST_DWithin` for Karachi venue discovery).
- **Security Baseline:** Row Level Security (RLS) enabled on *every* table. Default-deny posture.
- **Tenant Architecture:** Shared Schema with RLS-Enforced Isolation.

---

## 2. Global Enums
- `user_role`: `'customer'`, `'venue_owner'`, `'venue_staff'`, `'admin'`, `'super_admin'`
- `venue_status`: `'draft'`, `'submitted'`, `'under_review'`, `'approved'`, `'published'`, `'rejected'`, `'suspended'`, `'archived'`
- `slot_status`: `'available'`, `'held'`, `'booked'`, `'blocked'`, `'maintenance'`
- `booking_status`: `'confirmed'`, `'completed'`, `'cancelled_by_customer'`, `'cancelled_by_venue'`, `'no_show'`
- `payment_status`: `'pending'`, `'paid'`, `'failed'`, `'refunded'`
- `media_status`: `'pending'`, `'approved'`, `'rejected'`

---

## 3. Core Tables & Chain of Ownership

### `profiles` (Top Level)
Extends Supabase `auth.users`.
- `id` (uuid, PK, references `auth.users.id`)
- `role` (user_role, default `'customer'`)
- `name` (text, not null)
- `phone` (text, unique, not null)
- `avatar_url` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

### `venues` (Child of profiles)
- `id` (uuid, PK)
- `owner_id` (uuid, references `profiles.id`) — *Establishes multi-tenant B2B ownership*
- `name` (text, not null)
- `slug` (text, unique, not null)
- `description` (text)
- `address` (text, not null)
- `coordinates` (geography(Point, 4326), not null) — *PostGIS spatial point*
- `area_id` (uuid, nullable) 
- `status` (venue_status, default `'draft'`)
- `avg_rating` (numeric, default 0.0)
- `amenities` (jsonb, default '{}'::jsonb) — *Flexible schema for features like parking, indoor/outdoor*
- `created_at`, `updated_at` (timestamptz)

### `courts` (Child of venues)
- `id` (uuid, PK)
- `venue_id` (uuid, references `venues.id`, cascade delete)
- `name` (text, not null) — e.g., "Futsal Court A"
- `sport_type` (text, not null) — e.g., "Futsal", "Badminton"
- `hourly_rate` (numeric, not null)
- `metadata` (jsonb, default '{}'::jsonb) — *Flexible schema for surface type, dimensions*
- `created_at`, `updated_at` (timestamptz)

### `slots` (Child of courts)
Pre-generated bookable inventory.
- `id` (uuid, PK)
- `court_id` (uuid, references `courts.id`, cascade delete)
- `date` (date, not null)
- `start_time` (time, not null)
- `end_time` (time, not null)
- `status` (slot_status, default `'available'`)
- `held_by` (uuid, references `profiles.id`, nullable)
- `held_until` (timestamptz, nullable)
- *Constraint:* Unique index on `(court_id, date, start_time)` to prevent duplicate inventory mapping.

### `bookings` (Child of slots & profiles)
Stores confirmed reservations and tracks digital wallet transactions.
- `id` (uuid, PK)
- `booking_ref` (text, unique, not null) — human readable, e.g., `KHEL-7F3K2`
- `customer_id` (uuid, references `profiles.id`)
- `slot_id` (uuid, references `slots.id`)
- `court_id` (uuid, references `courts.id`) — *Denormalized for faster RLS & queries*
- `venue_id` (uuid, references `venues.id`) — *Denormalized for faster RLS & queries*
- `status` (booking_status, default `'confirmed'`)
- **Payment & Payout Tracking Columns (MVP Digital Wallet Integration):**
  - `payment_status` (payment_status, default `'pending'`)
  - `payment_gateway_ref` (text, nullable) — transaction ID from wallet aggregator
  - `total_charged` (numeric, not null) — total amount paid by customer via digital wallet
  - `venue_payout_amount` (numeric, not null) — amount owed/routed to venue owner
  - `commission_amount_snapshot` (numeric, default 0.00) — explicitly tracked as 0 for MVP history
- `created_at`, `updated_at` (timestamptz)

---

## 4. Row Level Security (RLS) Policy Summary (Multi-Tenant Isolation)

### Global Admin Rule
- Users where `role = 'admin'` or `'super_admin'` bypass all tenant constraints and have `ALL` privileges on all tables.

### 1. `profiles`
- **All Users:** Can `SELECT` and `UPDATE` their own profile (`id = auth.uid()`).

### 2. `venues`
- **Customers / Anonymous:** Can `SELECT` rows where `status = 'published'`.
- **Venue Owners:** Can `SELECT`, `INSERT`, and `UPDATE` rows where `owner_id = auth.uid()`.

### 3. `courts` & `slots`
- **Customers / Anonymous:** Can `SELECT` rows linked to a `published` venue.
- **Venue Owners:** Can `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where the parent `venue.owner_id = auth.uid()`. (Enforced via a subquery or joined security view).
- **System Actions:** `slots` are strictly mutated by RPCs (like `hold_slot` or chron jobs) when booked by customers.

### 4. `bookings`
- **Customers:** Can `SELECT` and `INSERT` rows where `customer_id = auth.uid()`.
- **Venue Owners:** Can `SELECT` and `UPDATE` (e.g., mark as `no_show`) rows where the denormalized `venue_id` links back to a venue they own (`venues.owner_id = auth.uid()`).