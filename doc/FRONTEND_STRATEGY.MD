# FRONTEND_STRATEGY.md

## 1. Tech Stack & Core Philosophy
Khel.com relies on a "thick database, thin client" architecture. All business logic, concurrency control, spatial math, and security rules live in PostgreSQL/Supabase. The frontend is strictly a presentation and routing layer.

* **Framework:** Next.js (App Router) — replacing the previous Vite/React proof-of-concept.
* **Language:** Strict TypeScript (no `any` types).
* **Styling:** Tailwind CSS & Shadcn UI (or similar headless components).
* **Data Fetching:** TanStack Query (React Query) is mandatory for all client-side state, reads, and mutations.
* **Authentication:** `@supabase/ssr` for secure, cookie-based session management and middleware routing.
* **Database Types:** Always use the generated types from `supabase gen types typescript`.

## 2. Unified Application Structure
We are abandoning the monorepo approach. The frontend must be a single Next.js application to simplify deployments and state management. 

Use **Next.js Route Groups** to isolate the application namespaces without affecting the URL structure:
* `src/app/(customer)/`: Public discovery, venue details, court booking, and checkout.
* `src/app/(partner)/`: Venue owner dashboard (manage courts, generate slots, view bookings).
* `src/app/(admin)/`: Platform administration (approve venues, view platform-wide metrics).

A single Next.js `middleware.ts` file must protect the `/(partner)` and `/(admin)` routes by reading the user's `role` from the Supabase session/database.

## 3. Migration & Cleanup Directive (AI Agent Instructions)
**Agent Instruction:** Before generating new code, inspect the `apps_archive/` directory (the deprecated monorepo) and the `web/` directory (the deprecated Vite app).

1. **Evaluate `apps_archive/`:** Review the existing React components and pages.
   * **Migrate:** If the code contains highly reusable UI components (e.g., Tailwind buttons, modals) or well-structured layout shells, copy them into the new Next.js `src/components/` or appropriate route group.
   * **Discard:** If the code relies on raw `useEffect`/`useState` for data fetching instead of TanStack Query, uses standard React Router instead of Next.js App Router, or violates the single-app structure, **do not copy it**. Start fresh.
2. **Execute Cleanup:** Once all usable assets are migrated to the new Next.js structure, permanently delete both the `apps_archive/` folder and the `web/` folder.

## 4. Backend Contracts & Frontend Guardrails
The frontend must strictly adhere to the following backend rules:

* **Anti-Hardcoding:** Never hardcode platform variables (commission rates, search radiuses, hold timers). Query the `public.app_config` singleton table (`id = 1`) on app initialization or via a global context provider.
* **Spatial Discovery:** Use the `search_venues_nearby(p_lat, p_lon, p_radius_km)` RPC. The frontend must request HTML5 Geolocation. If the user denies it, fallback to central Karachi coordinates (Lat: 24.8607, Lon: 67.0011) and provide a manual area dropdown.
* **Booking Concurrency & Freemium Holds:** Use the `hold_slot(p_court_id, p_date, p_start_time)` RPC for the checkout flow.
   * *Required UI Catch 1:* If it throws `'Slot is not available'`, display a UI state informing the user the court was just booked by someone else.
   * *Required UI Catch 2:* If it throws `'freemium_limit_reached'`, trigger an "Upgrade to Premium" paywall modal.
   * *Countdown:* Use the returned `held_until` timestamp to drive a strict 5-minute countdown on the checkout screen.
* **Payment Ledger:** The frontend must **never** call `confirm_booking_with_payment` directly. The frontend initiates the gateway session; the gateway's server-to-server webhook hits our Edge Function, which securely finalizes the database ledger. The frontend simply polls or listens to the `bookings.payment_status` to transition from `pending` to `paid`.