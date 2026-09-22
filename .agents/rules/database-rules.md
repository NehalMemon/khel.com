---
trigger: always_on
---

# Database & Backend Rules

1. **Migration Immutability:** NEVER modify an existing, previously applied SQL migration file. To add columns or tables, generate a new migration file via the CLI (`supabase migration new <descriptive_name>`).
2. **Order of Operations:** Every SQL migration must strictly follow this order: Enums -> Tables -> Functions/Triggers -> RLS Policies.
3. **Flexible Schema Design:** Use explicit typed columns for relational integrity, indexing, or RLS (e.g., `status`, `owner_id`). Use `JSONB` for highly variable, generic attributes (e.g., `amenities` or `metadata`) to prevent schema bloat.
4. **RPC Modularity:** Keep PostgreSQL Functions (RPCs) strictly atomic. A function must execute exactly one primary state mutation. Do not bundle unrelated operations.