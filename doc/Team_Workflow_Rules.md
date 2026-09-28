---
trigger: always_on
---

# Team Workflow & Ownership Rules

1. **Ownership boundary:** Abid owns frontend, Nehal owns backend. Frontend work must never modify anything under `supabase/` (migrations, config, seed, edge functions) or otherwise change backend logic. A frontend need that implies a backend change is written up in `doc/DESIGN_BACKEND.md` → Open Items, not made directly.
2. **Three separate frontend apps, not one app with route groups:** a **User** app (customer marketplace), a **Venue owner** app (the partner portal), and a fully separate **Admin** app (admin / super_admin only). Do not merge them into a single Next.js project. See `doc/DESIGN_FRONTEND.md` §2 for the split and the reasoning.
   *Amended 2026-09-28: this originally said two apps, with the partner portal living inside the user app under `/partner/*`. The partner portal was built that way, then re-split into `apps/venue-owner` so it could have its own deployment cadence, its own `venue_owner`-only route guard, and its own signup surface.*
3. **Framework:** Next.js + TypeScript for both apps.
4. **Components:** shadcn/ui, themed for khel.com. Don't ship components with unedited default shadcn styling.
5. **Branching:** all frontend work happens on `abid-dev`. Feature branches merge into `staging`, not directly into `main`. Before any git write operation, confirm the current branch is `abid-dev`; never commit to `main`, `staging`, `abid`, or `nehal-dev` on the frontend's behalf.
6. **Project docs:** `doc/ARCHITECTURE.md` (system architecture), `doc/SCHEMA.md` (database blueprint), `doc/API_CONTRACTS.md` (RPC/webhook contracts), `doc/TESTING_GUIDELINES.MD` (QA standards), and the Backend↔Frontend Handoff doc (feature-by-feature backend status) are all shared context — read whatever's relevant before building. `doc/DESIGN_FRONTEND.md` is the frontend spec specifically — follow it. `doc/DESIGN_BACKEND.md` is reference material for Nehal only; he is not obligated to implement it as written.