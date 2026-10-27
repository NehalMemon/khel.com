import type { VenueApplicationInsert, VenueApplicationRow } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"

/** The public apply form only collects these columns; the rest are backend-owned. */
export type VenueApplicationValues = Pick<
  VenueApplicationInsert,
  "applicant_name" | "email" | "phone" | "venue_name" | "venue_address"
>

const applicationFields =
  "id, applicant_name, email, phone, venue_name, venue_address, status, admin_notes, created_at, updated_at"

function handleError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/**
 * Public onboarding intake. The `venue_applications` INSERT policy is
 * `WITH CHECK (true)` (migration 20261015114427), so an anonymous visitor can
 * submit without an account. `status` is left at the backend default (`pending`)
 * and is never chosen by the client.
 *
 * Do not add `.select()` here: the table's only SELECT policy is admin-only, so
 * an anonymous `INSERT ... RETURNING` is rejected/returns no row even though the
 * insert itself succeeds. The form does not need the created row back.
 */
export async function submitVenueApplication(
  values: VenueApplicationValues,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Connect Supabase before submitting an application.")
  }
  const { error } = await getSupabaseBrowserClient()
    .from("venue_applications")
    .insert(values)
  handleError(error)
}

/**
 * Admin review queue. The `venue_applications` SELECT policy restricts reads to
 * `profiles.role = 'admin'`, so this returns rows only for admin sessions.
 */
export async function fetchPendingApplications(): Promise<VenueApplicationRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("venue_applications")
    .select(applicationFields)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
  handleError(error)
  return (data ?? []) as VenueApplicationRow[]
}
