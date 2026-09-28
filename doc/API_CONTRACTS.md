# API Contracts & RPC Signatures (`API_CONTRACTS.md`)

## 1. Overview

The React frontend communicates with the Supabase PostgreSQL database primarily through auto-generated PostgREST endpoints (for simple reads like `GET /venues`) and explicit Remote Procedure Calls (RPCs) for all state-mutating business logic.

## 2. Core RPC Functions

### `hold_slot`

Atomically locks a slot for a short duration with high-concurrency race condition protection (`FOR UPDATE SKIP LOCKED`) and freemium quota checks.

**Input Payload:**

```json
{
  "p_court_id": "uuid",
  "p_date": "YYYY-MM-DD",
  "p_start_time": "HH:MM:SS"
}
```

**Execution & Constraints:**

- `SECURITY DEFINER` function (`SET search_path = public`).
- Enforces strict transactional execution order:
  1. Executes `SELECT ... FOR UPDATE SKIP LOCKED` on `public.slots` to lock the slot immediately and protect against concurrent race conditions.
  2. Resolves caller identity via `auth.uid()`.
  3. Checks caller's `subscription_tier` in `public.profiles`. If `'free'`, counts hold records in `public.hold_logs` from the past 7 days (`created_at > now() - INTERVAL '7 days'`).
  4. If count >= 1, aborts the transaction (rolling back and releasing the slot lock).
  5. Updates slot status to `'held'`, setting `held_by` and `held_until = now() + INTERVAL '5 minutes'`.
  6. Records an audit entry in `public.hold_logs`.

**Output:**

Returns an array containing:

```json
[
  {
    "slot_id": "string",
    "held_until": "string"
  }
]
```

**Exceptions & Error Handling:**

The function throws the following exact exception strings on failure (triggering automatic transaction rollback):

- `'Slot is not available'`: The requested slot is already booked, actively held by another session, or does not exist.
- `'freemium_limit_reached'`: The user is on the `'free'` subscription tier and has already used their 1 slot hold per 7 days quota.
- `'Not authenticated'`: The function was invoked without an active authenticated session (`auth.uid()` is null).

---

### `search_venues_nearby`

PostGIS spatial discovery RPC querying published venues within a specified radius of user coordinates.

**Input Payload:**

```json
{
  "p_lat": 24.8607,
  "p_lon": 67.0011,
  "p_radius_km": 10.0
}
```

**Execution & Constraints:**

- `SECURITY DEFINER` function (`SET search_path = public, extensions`).
- PostGIS calculation uses `ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography` with strict longitude-first ordering.
- Filters by `venues.status = 'published'` and `ST_DWithin(venues.coordinates, user_geo, p_radius_km * 1000)`.
- Calculates exact distance via `(ST_Distance(venues.coordinates, user_geo) / 1000.0)`.
- Ordered by `distance_km ASC`.

**Output:**

Returns an array of nearby venues:

```json
[
  {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "address": "string",
    "avg_rating": 4.8,
    "amenities": {},
    "images": [],
    "distance_km": 7.11
  }
]
```

---

### `confirm_booking_with_payment`

Called strictly by the payment webhook Edge Function (not the client) to finalize the booking and log the dynamic platform commission and venue payout.

**Input Payload:**

```json
{
  "p_booking_id": "uuid",
  "p_gateway_ref": "string",
  "p_amount_paid": "numeric"
}
```

**Execution & Constraints:**

- `SECURITY DEFINER` function (`SET search_path = public`).
- Enforces strict transactional execution order:
  1. Selects `slot_id` from `public.bookings` using `FOR UPDATE` row lock. If already paid, throws `'Booking already paid'`.
  2. Fetches dynamic `commission_rate` from `public.app_config WHERE id = 1`.
  3. Calculates `v_commission_amount = ROUND(p_amount_paid * commission_rate / 100, 2)` and `v_venue_payout = p_amount_paid - v_commission_amount`.
  4. Updates `bookings`: `status = 'confirmed'`, `payment_status = 'paid'`, `payment_gateway_ref = p_gateway_ref`, `total_charged = p_amount_paid`, `commission_amount_snapshot = v_commission_amount`, `venue_payout_amount = v_venue_payout`.
  5. Updates `slots`: `status = 'booked' WHERE id = v_slot_id`.

**Output:**

Returns the generated `booking_ref` string (e.g., `KHEL-9X2P`).


## 3. Webhook Payloads (Edge Functions)

### Payment Success Callback (From Aggregator)

The exact structure depends on the chosen Pakistani payment gateway, but the Edge Function must standardize it to:

**Expected Inbound Data:**

```json
{
  "transaction_id": "string",
  "status": "PAID",
  "amount": "numeric",
  "metadata": {
    "slot_id": "uuid",
    "customer_id": "uuid"
  }
}
```

**Action:**

Verifies gateway signature/hash, then executes the `confirm_booking_with_payment` RPC.