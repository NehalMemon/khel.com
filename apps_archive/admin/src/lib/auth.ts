import type { Session } from "@supabase/supabase-js"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import { getAuthErrorMessage } from "@/lib/utils"

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

export async function signOut() {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabaseBrowserClient().auth.signOut()
  if (error) throw error
}
