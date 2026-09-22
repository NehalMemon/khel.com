---
description: 
---

# Comprehensive Codebase Audit
**Trigger Command:** `/audit`

**Agent Instructions:**
When this command is triggered, perform a deep, cross-directory scan verifying the sync between the database and the frontend.
1. **Type Synchronization:** Compare the tables defined in `supabase/migrations/` against the TypeScript interfaces in `web/src/types/database.types.ts`. Flag any missing columns, mismatched types, or missing enums.
2. **API Contract Verification:** Scan the React data fetching hooks. Ensure they exactly match the expected JSON payloads defined in `docs/API_CONTRACTS.md` for functions like `hold_slot`.
3. **Rule Enforcement:** Read all files in `docs/rules/`. Scan the current staged Git changes to ensure no new code violates the database immutability or frontend architecture rules.
4. **Output:** Generate a "Pre-Commit Audit Report" with Pass/Fail metrics for Security, Quality, and Synchronization, followed by the commands needed to resolve any failures.