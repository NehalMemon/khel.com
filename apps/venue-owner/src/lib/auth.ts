import type { Session } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import { getAuthErrorMessage, normalizePhone, MIN_PASSWORD_LENGTH } from "@/lib/utils"

export type SignInInput = {
  email: string
  password: string
}

export type PartnerSignUpInput = {
  name: string
  email: string
  phone: string
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

/**
 * Partner signup. `role` is hardcoded to `venue_owner`: this application never
 * requests any other role, and admin/super_admin are never self-service.
 * The `handle_new_user` trigger provisions `public.profiles` from this payload,
 * so the frontend must not write to that table.
 */
export async function signUpVenueOwner(input: PartnerSignUpInput) {
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
        role: "venue_owner",
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
