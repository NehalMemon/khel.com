---
trigger: always_on
---

# Antigravity Agent Coding & Database Rules

## 1. Migration Immutability
- **Rule:** NEVER modify an existing, previously applied SQL migration file. 
- **Action:** To add new columns, tables, or fields, you must generate a new migration file via the CLI (`supabase migration new <descriptive_name>`) and use `ALTER TABLE` statements. Ensure the strict order of operations: Enums -> Tables -> Functions -> RLS.

## 2. Flexible Schema Design (JSONB vs Columns)
- **Rule:** Use explicit typed columns for data that requires relational integrity, indexing, or RLS filtering (e.g., `status`, `owner_id`, `coordinates`).
- **Rule:** Use `JSONB` data types for highly variable, unstructured, or generic attributes (e.g., an `amenities` or `metadata` column in `venues` for flexible JSON like `{ "has_parking": true, "indoor": false }`). This prevents schema bloat when adding minor features.

## 3. Anti-Hardcoding Policy
- **Rule:** NEVER hardcode business rules, MVP commission rates (0%), or location search radiuses in React components or Edge Functions.
- **Action:** Treat the React frontend as a "dumb" presentation layer. All platform rules must be read dynamically from the database or secure environment variables. 

## 4. RLS & Security Maintenance
- **Rule:** Every new table MUST include an `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` statement. Default to a deny-all posture.
- **Rule:** When adding new columns that contain sensitive financial or personal data, explicitly evaluate and write new RLS policies to restrict column-level or row-level access.

## 5. API & RPC Modularity
- **Rule:** Keep PostgreSQL Functions (RPCs) strictly atomic and modular. A function must execute exactly one primary state mutation.
- **Action:** If a feature requires multiple steps (like booking a slot and processing a digital wallet webhook), separate the logic into distinct RPCs or Edge Functions. Never bundle unrelated operations into a single massive function.