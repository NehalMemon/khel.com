---
trigger: always_on
---

# Frontend & Code Quality Rules
1. **Anti-Hardcoding:** Treat React as a presentation layer. Read rules from the database or environment variables.
2. **Strict TypeScript:** No `any` types. Use explicit interfaces from our generated Supabase types.
3. **Component Reusability:** Refactor repeated UI elements into `src/components/ui/`.
4. **Linting Compliance:** Ensure all `useEffect` dependency arrays are exhaustive.