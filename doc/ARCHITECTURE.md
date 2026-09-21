# System Architecture & Technical Guidelines (`ARCHITECTURE.md`)

## 1. System Overview
The Indoor Sports Booking Platform follows a thick-database, thin-client architecture. Supabase acts as the unified backend (Database, Authentication, Storage, and Edge Functions), while a React single-page application (SPA) handles the presentation layer. To ensure transactional safety—especially regarding digital wallet payments and slot availability—all critical business logic executes inside PostgreSQL via `SECURITY DEFINER` Remote Procedure Calls (RPCs), never in the client.

## 2. Frontend Architecture (React)
- **Framework:** React.js (Mobile-first responsive design).
- **State Management (Server State):** TanStack Query (React Query) is mandatory for fetching, caching, and synchronizing all data from Supabase. 
- **State Management (Client State):** React Context is restricted to globally required UI state (e.g., active filters, user session context, theme). Avoid global state managers (like Redux or Zustand) unless cross-route booking state strictly demands it.
- **Data Fetching:** Direct Supabase client SDK calls wrapped inside TanStack Query hooks.
- **Routing:** Role-based namespaced routing (`/app` for customers, `/partner` for venue owners, `/admin` for platform administrators).

## 3. Backend & Database Architecture (Supabase)
- **Core Engine:** PostgreSQL with the `postgis` extension enabled for geospatial queries (`ST_DWithin`).
- **Data Access Layer:** Row Level Security (RLS) is the primary authorization boundary. The React client connects directly to the database via PostgREST, constrained entirely by RLS policies.
- **Business Logic (RPCs):** Any operation involving state transitions (e.g., holding a slot, confirming a booking, checking review eligibility) must be written as a PL/pgSQL function exposed via RPC. 
- **Configuration Management:** Hardcoded business rules are strictly forbidden. Radius limits, default slot durations, hold expiry times, and the 0% MVP commission rate must be read from the `app_config` table.

## 4. Payment & Webhook Infrastructure (Edge Functions)
Because the MVP relies on digital wallet pass-through payments, secure external communication is required.
- **Runtime:** Supabase Edge Functions written in TypeScript/Node.js manage all external API communication. 
- **Payment Initiation:** When a user confirms a hold, the client calls an Edge Function. The function retrieves the live payment gateway API key from secure environment variables, initiates the digital wallet checkout session, and returns the payment URL/token to the client.
- **Webhook Reconciliation:** The payment gateway fires a webhook back to a dedicated Edge Function upon payment success or failure. This Node.js function validates the webhook signature, then internally calls the `confirm_booking_with_payment` RPC to finalize the slot and log the payout ledger.
- **Secret Management:** API keys for payment gateways and SMS/OTP providers must only exist in Edge Function secrets, never exposed to the React bundle.

## 5. Security & Trust Boundaries
- **Zero Client Trust:** The React client is treated as an untrusted presentation layer. It may provide filtering parameters or IDs, but it must never dictate price, calculate commissions, or assert that a slot is available.
- **Atomic Concurrency:** The core guarantee of the platform is zero double-bookings. The `hold_slot` RPC must use the `UPDATE ... WHERE status = 'available' RETURNING *` pattern to atomically lock inventory. 
- **Idempotency:** Payment webhooks and booking confirmation RPCs must be idempotent. If a digital wallet provider fires the success webhook twice for the same transaction, the database must gracefully ignore the second attempt without duplicating the confirmation or the ledger entry.