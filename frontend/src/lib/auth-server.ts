import type { UserRole } from "@/lib/database.types"
import { isSupabaseConfigured } from "@/lib/supabase-browser"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export type ServerViewer = {
  id: string
  role: UserRole
  name: string
}

/**
 * Resolves the signed-in user and their `public.profiles` row on the server.
 *
 * Server layouts call this to gate a whole route group before any client
 * component renders: `createSupabaseServerClient` reads the auth cookies that
 * the browser client wrote, so the guard sees the same session the client does.
 *
 * Returns `null` when Supabase is not configured, when there is no session, or
 * when the profile row cannot be read. The distinction does not matter to the
 * guards — an unverifiable viewer is treated exactly like a signed-out one.
 */
export async function getServerViewer(): Promise<ServerViewer | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, name")
      .eq("id", user.id)
      .maybeSingle()
    if (!profile) return null
    return { id: profile.id, role: profile.role, name: profile.name }
  } catch {
    // `createSupabaseServerClient` throws when the environment is missing and
    // cookie reads can fail during static generation; both mean "no viewer".
    return null
  }
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin"
}

/** Roles allowed into the owner portal. Mirrors the `proxy.ts` route guard. */
export function isPartnerRole(role: UserRole | null | undefined): boolean {
  return role === "venue_owner"
}
