import type { Session } from "@supabase/supabase-js"
import type { Database, UserRole } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import { getAuthErrorMessage, normalizePhone } from "@/lib/utils"

/**
 * The customer app is the only place a public signup form exists, and it may
 * only ever create a `customer`. Venue owners sign up in
 * `apps/venue-owner`, and admin roles are never self-service. Narrowing the
 * type means a future form cannot widen this by accident.
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
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return data
}

export async function signUp(input: SignUpInput) {
  const name = input.name.trim()
  const phone = normalizePhone(input.phone)
  if (!name) throw new Error("Please enter your name.")
  if (!phone) throw new Error("Enter a valid Pakistani mobile number.")
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.")
  }
  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        name,
        phone,
        role: input.role,
      },
    },
  })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return data
}

export async function signOut() {
  const { error } = await getSupabaseBrowserClient().auth.signOut()
  if (error) throw error
}

export type DatabaseClient = ReturnType<typeof getSupabaseBrowserClient>
export type SupabaseDatabase = Database
