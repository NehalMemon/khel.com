# Quality Assurance & Testing Standard (`TESTING_GUIDELINES.md`)

## 1. Testing Philosophy

No feature is considered complete unless its security constraints and concurrency guarantees are explicitly tested. Because the platform's core value proposition is zero double-bookings and trusted payout tracking, testing focuses heavily on the database layer.

## 2. Mandatory Test Categories

### Row Level Security (RLS) Testing

Every table must have its RLS policies tested against all roles (`anonymous`, `customer`, `venue_owner`, `admin`).

- **Rule:** Write tests that explicitly attempt to violate RLS. A successful test is one where a `customer` is denied an `UPDATE` on another customer's booking.
- **Execution:** Run locally via standard Postgres testing frameworks (e.g., `pgTAP`) or automated integration scripts in Node.js before pushing migrations.

### Atomic Concurrency Testing

The `hold_slot` RPC must be stress-tested to guarantee race-condition safety.

- **Rule:** A script must fire 10 or more simultaneous hold requests at the exact same slot ID using different mocked user sessions.
- **Success Criteria:** Exactly 1 request succeeds and returns the held slot. The other 9 requests must cleanly fail with a specific "slot unavailable" conflict, without crashing the database.

### Payment Webhook Idempotency

- **Rule:** Simulate the payment gateway firing the "Success" webhook twice for the same transaction ID.
- **Success Criteria:** The Edge Function must process the first request, confirm the booking, and log the payout. The second request must return a `200 OK` (to satisfy the gateway) but perform absolutely no database mutations.

## 3. Deployment Gates

Before any PR is merged from a feature branch into the `staging` branch, the CI pipeline must:

1. Spin up a fresh Supabase shadow database.
2. Apply all migrations from `supabase/migrations/`.
3. Apply `supabase/seed.sql`.
4. Execute the RLS and Concurrency test suites.
5. Fail the build if any test fails. Manual overrides are not permitted for security or booking logic.