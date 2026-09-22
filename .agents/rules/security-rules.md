---
trigger: always_on
---

# Security & Trust Boundaries

1. **Zero-Trust Edge Functions:** Never trust incoming client payloads. Every Supabase Edge Function must explicitly validate inbound payloads using a schema validator (e.g., Zod) before executing logic.
2. **Mandatory RLS:** Every new table MUST include an `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` statement. Default to a deny-all posture.
3. **RLS Bypass Prevention:** When writing `SECURITY DEFINER` Postgres functions, explicitly set the `search_path` (e.g., `SET search_path = public`) to prevent search path injection attacks.
4. **Secret Management:** Never hardcode API keys or database URLs. Use `process.env` in Node.js Edge Functions and `import.meta.env` in Vite/React.