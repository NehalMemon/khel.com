# Backend to Frontend Handoff Protocol

This document establishes the official asynchronous communication and handoff protocol between the Backend and Frontend engineering teams for Khel.com. 

Whenever a backend feature, migration, or API service is completed, it must be documented here using the standard template below before the frontend begins implementation.

---

## Standard Feature Template

```markdown
## [Feature Name]

### Backend Status
- **Status:** [Planned | In Progress | Completed]
- **Branch / PR:** [Branch or PR reference]
- **Migrations / Functions:** [List of new migrations, tables, RPCs, or triggers]
- **Notes:** [Key architectural or security notes]

### Database API / Supabase Usage
- **Client Method:** [Exact Supabase client calls, e.g., supabase.from(...), supabase.rpc(...), supabase.auth.signUp(...)]
- **Expected Payload:** [TypeScript interface or JSON schema of expected arguments]
- **Response Format:** [Shape of returned data or generated types reference]
- **Permissions & RLS:** [Role access, e.g. customer, venue_owner, authenticated, anon]

### Frontend UI/UX Requirements
- **Target Components / Views:** [Where this feature lives in src/]
- **Required Inputs & Validations:** [Field validations, regex patterns, constraints]
- **State Handling:** [Loading, success, empty, and error states]
- **Edge Cases:** [Network retries, fallback handling, edge scenarios]
```

---

## User Authentication & Profile Synchronization

### Backend Status
- **Status:** Completed
- **Branch / PR:** `staging`
- **Migrations / Functions:**
  - Migration: `supabase/migrations/20260924112825_sync_auth_users_to_profiles.sql`
  - Function: `public.handle_new_user()` (`SECURITY DEFINER`, `SET search_path = public`)
  - Trigger: `on_auth_user_created` (`AFTER INSERT ON auth.users FOR EACH ROW`)
- **Notes:** The database now automatically provisions a row in `public.profiles` upon every new signup in `auth.users`. Handled with `ON CONFLICT (id) DO NOTHING` for idempotency and safe enum casting.

### Database API / Supabase Usage
- **Client Calls:** The frontend must **only** interact with Supabase Auth. **Do not** manually insert or upsert into `public.profiles`.
  ```typescript
  // 1. Sign Up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: trimmedName,
        phone: formattedPhone, // e.g. "+923001234567"
        role: role,            // optional: 'customer' (default) or 'venue_owner'
      }
    }
  });

  // 2. Sign In
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  ```
- **Payload Mapping in Trigger:**
  - `name`: Read from `options.data.name` (falls back to `'Unknown'` if null or empty).
  - `phone`: Read from `NEW.phone` or `options.data.phone`. If missing or empty, the trigger automatically assigns `'pending-' || NEW.id` to satisfy the `NOT NULL` and `UNIQUE` constraints without failing the signup transaction.
  - `role`: Read from `options.data.role`, validated against `public.user_role` enum (`'customer'`, `'venue_owner'`, `'venue_staff'`, `'admin'`, `'super_admin'`), defaulting to `'customer'`.
  - `avatar_url`: Read from `options.data.avatar_url` (nullable).
- **TypeScript Types:** Updated and synced in `web/src/types/database.types.ts`.

### Frontend UI/UX Requirements
- **Target Components / Views:**
  - `web/src/pages/auth/SignUp.tsx` (Customer signup)
  - `web/src/pages/PartnerJoin.tsx` (Venue partner registration)
  - `web/src/pages/auth/SignIn.tsx` (User login)
- **Required Inputs & Validations:**
  - **Full Name:** Required, non-empty, trimmed string.
  - **Phone Number:** 
    - Must be validated before form submission.
    - Pakistani format recommended: `^((\+92)|(0092)|(0))?3[0-9]{9}$` (e.g., `+923001234567` or `03001234567`). Normalize to E.164 format before sending.
  - **Password:** Minimum 8 characters with strength indicator.
  - **Role Specification:** Pass `role: 'venue_owner'` when signing up from the Partner Portal (`/partner/join`); default or pass `role: 'customer'` for marketplace users.
- **State Handling & Edge Cases:**
  - **Profile Completion Notice:** If a user signed up via an external provider or email without a phone number (i.e. their profile has `phone LIKE 'pending-%'`), prompt them with a banner/modal to complete their profile with a verified phone number before booking or listing venues.
  - **Duplicate Phone Error:** If a phone number is already registered to another user, display an explicit inline error: *"This phone number is already linked to an account."*
