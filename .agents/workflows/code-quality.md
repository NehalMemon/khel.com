---
description: 
---

# Code Quality & React Standards Check
**Trigger Command:** `/quality`

**Agent Instructions:**
When this command is triggered, scan the `web/src/` directory (React frontend) and `supabase/` backend code against the project's quality rules.
1. **Type Strictness:** Search the codebase for the `any` type in TypeScript files. Flag them and suggest explicit interfaces.
2. **Anti-Hardcoding Check:** Scan React components for hardcoded numbers, commission rates, or status strings. Flag them and provide code to map them to the database enums or environment variables.
3. **Component Duplication:** Analyze UI components (like buttons, cards, or badges). If similar inline JSX is repeated in multiple files, generate a unified reusable component for `web/src/components/ui/`.
4. **React Hooks:** Check all `useEffect` and `useCallback` hooks for missing dependencies in their arrays.
5. **Output:** Provide a bulleted list of refactoring targets and the immediate code blocks to apply the fixes.