# API Contracts & RPC Signatures (`API_CONTRACTS.md`)

## 1. Overview

The React frontend communicates with the Supabase PostgreSQL database primarily through auto-generated PostgREST endpoints (for simple reads like `GET /venues`) and explicit Remote Procedure Calls (RPCs) for all state-mutating business logic.

## 2. Core RPC Functions

### `hold_slot`

Atomically locks a slot for a short duration to prevent race conditions during digital wallet checkout.

**Input Payload:**

```json
{
  "p_court_id": "uuid",
  "p_date": "YYYY-MM-DD",
  "p_start_time": "HH:MM:SS"
}
```

**Execution & Constraints:**

- `SECURITY DEFINER` function.
- Executes:

  ```sql
  UPDATE slots
  SET status = 'held',
      held_by = auth.uid(),
      held_until = NOW() + INTERVAL '5 minutes'
  WHERE id = target_id
    AND status = 'available'
  RETURNING *;
  ```

**Output:**

Returns the updated slot object if successful. If 0 rows are returned, throws a conflict error (slot already taken).

---

### `confirm_booking_with_payment`

Called strictly by the payment webhook Edge Function (not the client) to finalize the booking and log the 0% commission payout.

**Input Payload:**

```json
{
  "p_slot_id": "uuid",
  "p_customer_id": "uuid",
  "p_gateway_ref": "string",
  "p_amount_paid": "numeric"
}
```

**Execution & Constraints:**

- Validates that the slot is currently `held` by `p_customer_id`.
- Inserts a new row into `bookings` with `payment_status = 'paid'` and `commission_amount_snapshot = 0`.
- Updates `slots` status to `booked`.

**Output:**

Returns the generated `booking_ref` (e.g., `ISB-9X2P`).

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