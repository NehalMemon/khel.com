import type { ProfileRow, ProfileUpdate } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import { isPendingPhone } from "@/lib/utils"

/**
 * Shared `public.profiles` reads and self-service updates. The frontend never
 * inserts or upserts this table — the `handle_new_user` trigger provisions it
 * on signup (see `doc/HANDOFF.md`).
 */
const profileFields =
  "id, name, phone, avatar_url, role, subscription_tier, created_at, updated_at"

function handleError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await getSupabaseBrowserClient()
    .from("profiles")
    .select(profileFields)
    .eq("id", userId)
    .maybeSingle()
  handleError(error)
  return (data as ProfileRow | null) ?? null
}

/**
 * `profiles.subscription_tier` and `profiles.role` are protected by
 * `trg_protect_profile_tier_and_role`, so a self-service update deliberately
 * carries name, phone and avatar only. Role/tier changes live in the admin
 * console (`@/lib/queries/admin`).
 */
export async function updateProfile(
  userId: string,
  values: ProfileUpdate,
): Promise<ProfileRow> {
  if (!isSupabaseConfigured()) {
    throw new Error("Connect Supabase before using live data.")
  }
  if (values.phone !== undefined && isPendingPhone(values.phone)) {
    throw new Error("Enter a valid mobile number.")
  }
  const { data, error } = await getSupabaseBrowserClient()
    .from("profiles")
    .update(values)
    .eq("id", userId)
    .select(profileFields)
    .single()
  handleError(error)
  return data as ProfileRow
}
