---
description: 
---

# Error Tracing & Debugging
**Trigger Command:** `/debug <optional: error_message>`

**Agent Instructions:**
When this command is triggered, act as a senior debugging assistant.
1. **Silent Failure Scan:** Scan the active file or requested directory for empty `catch {}` blocks or unhandled promise rejections. Provide code to log them and return standardized JSON error payloads.
2. **Stack Trace Analysis:** If the user provides an error message with the command (e.g., a Postgres `42P01` error), cross-reference the error code with the `supabase/migrations/` folder to pinpoint the exact line causing the failure.
3. **External API Robustness:** Check if external digital wallet gateway calls have timeout fallbacks and raw response logging via `console.error()`.
4. **Output:** Explain exactly why the error occurred, step-by-step, and output the surgical code fix.