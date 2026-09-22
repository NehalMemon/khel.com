---
description: 
---

# Security & Vulnerability Audit
**Trigger Command:** `/security`

**Agent Instructions:**
When this command is triggered, immediately scan the `supabase/migrations/` directory and the `supabase/functions/` (Edge Functions) directory.
1. **RLS Verification:** Identify any `CREATE TABLE` statement missing a corresponding `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`.
2. **Policy Evaluation:** Flag any RLS policy that uses `true` for public writes or fails to scope to `auth.uid()`.
3. **RPC Safety:** Scan all Postgres functions. Flag any `SECURITY DEFINER` function missing `SET search_path = public`.
4. **Edge Function Sanitization:** Check Edge Functions for direct database inserts without prior schema validation (e.g., Zod). 
5. **Output:** Generate a markdown report listing exactly which files and line numbers violate security rules, and provide the exact SQL/TypeScript code to fix them.