import type { Session } from "@supabase/supabase-js"
import type { Database, UserRole } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import { getAuthErrorMessage, normalizePhone, MIN_PASSWORD_LENGTH } from "@/lib/utils"

/**
 * Public signup exists in exactly two places in this single app:
 * the customer marketplace (`/(customer)/auth/sign-up`) and the partner join
 * form (`/(partner)/partner/join`). Admin roles are never self-service, and
 * the user-facing form's role type is narrowed to `customer` so a future form
 * cannot widen it by accident.
 */
export type PublicSignupRole = Extract<UserRole, "customer">

export type SignUpInput = {
  name: string
  email: string
  phone: string
  password: string
  role: PublicSignupRole
}

export type PartnerSignUpInput = {
  name: string
  email: string
  phone: string
  password: string
}

export type SignInInput = {
  email: string
  password: string
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await getSupabaseBrowserClient().auth.getSession()
  if (error) throw error
  return data.session
}

export async function signIn(input: SignInInput) {
  if (!isSupabaseConfigured()) throw new Error("Connect Supabase before signing in.")
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return data
}

async function signUpWithRole(
  input: SignUpInput | PartnerSignUpInput,
  role: UserRole,
) {
  const name = input.name.trim()
  const phone = normalizePhone(input.phone)
  if (!name) throw new Error("Please enter your name.")
  if (!phone) throw new Error("Enter a valid Pakistani mobile number.")
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        name,
        phone,
        role,
      },
    },
  })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return data
}

/** Marketplace signup. Always creates a `customer`; never an admin role. */
export function signUp(input: SignUpInput) {
  return signUpWithRole(input, input.role)
}

/**
 * Partner signup. `role` is hardcoded to `venue_owner`: this path never
 * requests any other role, and admin/super_admin are never self-service. The
 * `handle_new_user` trigger provisions `public.profiles` from this payload, so
 * the frontend must not write to that table.
 */
export function signUpVenueOwner(input: PartnerSignUpInput) {
  return signUpWithRole(input, "venue_owner")
}

export async function signOut() {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabaseBrowserClient().auth.signOut()
  if (error) throw error
}

export type DatabaseClient = ReturnType<typeof getSupabaseBrowserClient>
export type SupabaseDatabase = Database
