import type { Session } from "@supabase/supabase-js"
import type { Database, UserRole } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import { getAuthErrorMessage, normalizePhone, MIN_PASSWORD_LENGTH } from "@/lib/utils"

/**
 * Public signup exists in exactly one place in this app: the customer
 * marketplace (`/(customer)/auth/sign-up`). Venue owners go through the
 * application flow (`/partner/apply`) and are provisioned by an admin, never
 * through a direct `auth.signUp()`. Admin roles are never self-service.
 */
export type PublicSignupRole = Extract<UserRole, "customer">

export type SignUpInput = {
  name: string
  email: string
  phone: string
  password: string
  role: PublicSignupRole
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
  input: SignUpInput,
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

export async function signOut() {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabaseBrowserClient().auth.signOut()
  if (error) throw error
}

/**
 * Where each role lands after authenticating. Customers with an explicit
 * `?next=` (the booking round trip) keep that destination; everyone else gets
 * their workspace so an owner never has to hunt for the portal.
 */
export function homePathForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin"
    case "venue_owner":
      return "/partner/overview"
    default:
      return "/"
  }
}

export type DatabaseClient = ReturnType<typeof getSupabaseBrowserClient>
export type SupabaseDatabase = Database
