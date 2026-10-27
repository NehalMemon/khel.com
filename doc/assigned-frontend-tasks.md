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

### Realtime on `public.notifications` — BLOCKED (backend dependency)
> `notifications` table + RLS + `notification_type` enum exist (migration
> `20261015121301_admin_ram_and_notifications.sql`). Realtime must be enabled for
> `public.notifications` (if not already) for the bell to update on new inserts. The
> frontend subscription is already in place (`notification-provider.tsx`).