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