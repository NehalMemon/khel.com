import type {
  ApplicationStatus,
  BookingRow,
  Database,
  ProfileRow,
  ResourceRow,
  SubscriptionTier,
  UserRole,
  VenueApplicationRow,
  VenueRow,
  VenueStatus,
} from "@/lib/database.types"
import type { AppConfigRow } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import { getErrorMessage } from "@/lib/utils"

const venueFields =
  "id, owner_id, name, slug, description, address, coordinates, area_id, status, avg_rating, amenities, max_advance_booking_days, operating_hours, subscription_tier, created_at, updated_at"
const resourceFields =
  "id, venue_id, name, category, hourly_rate, metadata, parent_id, is_active, created_at, updated_at"
const bookingFields =
  "id, booking_ref, customer_id, slot_id, resource_id, venue_id, status, payment_status, payment_gateway_ref, total_charged, venue_payout_amount, commission_amount_snapshot, start_time, end_time, created_at, updated_at"
const profileFields =
  "id, name, email, phone, avatar_url, role, subscription_tier, platform_permissions, created_at, updated_at"

export type AdminVenue = VenueRow & { resources: ResourceRow[] }

function requireConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("Connect Supabase before using live data.")
  }
}

function handleError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `admin_all_profiles` grants full access to platform admins, so role and tier
 * can be listed and changed here. The `subscription_tier` security trigger
 * explicitly permits admin writes and rejects self-promotion.
 */
export async function fetchProfiles(role?: UserRole): Promise<ProfileRow[]> {
  if (!isSupabaseConfigured()) return []
  let request = getSupabaseBrowserClient()
    .from("profiles")
    .select(profileFields)
  if (role) request = request.eq("role", role)
  const { data, error } = await request.order("created_at", { ascending: false })
  handleError(error)
  return (data ?? []) as ProfileRow[]
}

export async function updateProfileRole(
  userId: string,
  role: UserRole,
): Promise<ProfileRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select(profileFields)
    .single()
  handleError(error)
  return data as ProfileRow
}

export async function updateProfileTier(
  userId: string,
  subscriptionTier: SubscriptionTier,
): Promise<ProfileRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("profiles")
    .update({ subscription_tier: subscriptionTier })
    .eq("id", userId)
    .select(profileFields)
    .single()
  handleError(error)
  return data as ProfileRow
}

/* -------------------------------------------------------------------------- */
/* Venues                                                                       */
/* -------------------------------------------------------------------------- */

async function attachResources(venues: VenueRow[]): Promise<AdminVenue[]> {
  if (venues.length === 0) return []
  const { data: resourceData, error } = await getSupabaseBrowserClient()
    .from("resources")
    .select(resourceFields)
    .in(
      "venue_id",
      venues.map((venue) => venue.id),
    )
    .order("name")
  handleError(error)
  const resources = (resourceData ?? []) as ResourceRow[]
  return venues.map((venue) => ({
    ...venue,
    resources: resources.filter((resource) => resource.venue_id === venue.id),
  }))
}

export async function fetchReviewVenues(): Promise<AdminVenue[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("venues")
    .select(venueFields)
    .in("status", ["submitted", "under_review", "approved"])
    .order("updated_at", { ascending: true })
  handleError(error)
  return attachResources((data ?? []) as VenueRow[])
}

export async function fetchAllVenues(status?: VenueStatus): Promise<AdminVenue[]> {
  if (!isSupabaseConfigured()) return []
  let request = getSupabaseBrowserClient()
    .from("venues")
    .select(venueFields)
  if (status) request = request.eq("status", status)
  const { data, error } = await request.order("created_at", { ascending: false })
  handleError(error)
  return attachResources((data ?? []) as VenueRow[])
}

/**
 * The review queue gate. `approved -> published` is intentionally not offered:
 * ownership of that transition is still an open backend decision (see
 * `design.md`).
 */
export async function updateReviewStatus(
  venueId: string,
  expectedStatus: VenueStatus,
  status: VenueStatus,
): Promise<VenueRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("venues")
    .update({ status })
    .eq("id", venueId)
    .eq("status", expectedStatus)
    .select(venueFields)
    .single()
  handleError(error)
  return data as VenueRow
}

export function canTransitionVenue(from: VenueStatus, to: VenueStatus): boolean {
  const allowed: Record<VenueStatus, VenueStatus[]> = {
    draft: ["submitted", "archived"],
    submitted: ["under_review", "rejected"],
    under_review: ["approved", "rejected"],
    approved: [],
    published: ["suspended", "archived"],
    rejected: ["draft", "archived"],
    suspended: ["published", "archived"],
    archived: [],
  }
  return allowed[from].includes(to)
}

/* -------------------------------------------------------------------------- */
/* Resources (platform-wide inventory)                                          */
/* -------------------------------------------------------------------------- */

export type AdminResource = ResourceRow & { venueName: string; venueSlug: string }

export async function fetchAllResources(): Promise<AdminResource[]> {
  if (!isSupabaseConfigured()) return []
  const client = getSupabaseBrowserClient()
  const { data, error } = await client
    .from("resources")
    .select(resourceFields)
    .order("created_at", { ascending: false })
  handleError(error)
  const resources = (data ?? []) as ResourceRow[]
  if (resources.length === 0) return []
  const { data: venueData, error: venueError } = await client
    .from("venues")
    .select("id, name, slug")
    .in(
      "id",
      resources.map((resource) => resource.venue_id),
    )
  handleError(venueError)
  const venuesById = new Map(
    ((venueData ?? []) as { id: string; name: string; slug: string }[]).map((venue) => [
      venue.id,
      venue,
    ]),
  )
  return resources.map((resource) => {
    const venue = venuesById.get(resource.venue_id)
    return {
      ...resource,
      venueName: venue?.name ?? "Unknown venue",
      venueSlug: venue?.slug ?? "",
    }
  })
}

export async function updateResource(
  resourceId: string,
  values: { name?: string; category?: string | null; hourly_rate?: number },
): Promise<ResourceRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("resources")
    .update(values)
    .eq("id", resourceId)
    .select(resourceFields)
    .single()
  handleError(error)
  return data as ResourceRow
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchAllBookings(): Promise<BookingRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("bookings")
    .select(bookingFields)
    .order("created_at", { ascending: false })
  handleError(error)
  return (data ?? []) as BookingRow[]
}

/* -------------------------------------------------------------------------- */
/* Platform config                                                              */
/* -------------------------------------------------------------------------- */

/**
 * `admin_update_app_config` (migration 20260925142542) restricts writes to
 * `public.is_admin()`. Values are validated here so an out-of-range value can
 * never be sent to the backend.
 */
export type AppConfigValues = Omit<AppConfigRow, "id" | "updated_at">

const APP_CONFIG_LIMITS = {
  commission_rate: { min: 0, max: 1 },
  default_search_radius_km: { min: 1, max: 200 },
  hold_expiry_minutes: { min: 1, max: 120 },
} as const

export function validateAppConfig(values: AppConfigValues): string | null {
  for (const [key, limit] of Object.entries(APP_CONFIG_LIMITS)) {
    const value = values[key as keyof AppConfigValues]
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return `${key} must be a number.`
    }
    if (value < limit.min || value > limit.max) {
      return `${key} must be between ${limit.min} and ${limit.max}.`
    }
  }
  return null
}

export async function updateAppConfig(
  values: AppConfigValues,
): Promise<AppConfigValues> {
  requireConfigured()
  const invalid = validateAppConfig(values)
  if (invalid) throw new Error(invalid)
  const { data, error } = await getSupabaseBrowserClient()
    .from("app_config")
    .update(values)
    .eq("id", 1)
    .select("commission_rate, default_search_radius_km, hold_expiry_minutes")
    .single()
  handleError(error)
  return data as AppConfigValues
}

export function formatAdminError(error: unknown): string {
  return getErrorMessage(error)
}

/* -------------------------------------------------------------------------- */
/* Venue Applications (Onboarding)                                            */
/* -------------------------------------------------------------------------- */

export async function fetchVenueApplications(
  status?: ApplicationStatus,
): Promise<VenueApplicationRow[]> {
  if (!isSupabaseConfigured()) return []
  let request = getSupabaseBrowserClient()
    .from("venue_applications")
    .select("*")
  if (status) request = request.eq("status", status)
  const { data, error } = await request.order("created_at", { ascending: false })
  handleError(error)
  return (data ?? []) as VenueApplicationRow[]
}

export async function updateVenueApplicationStatus(
  id: string,
  status: ApplicationStatus,
  adminNotes?: string,
): Promise<VenueApplicationRow> {
  requireConfigured()
  const payload: { status: ApplicationStatus; admin_notes?: string; updated_at: string } = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (adminNotes !== undefined) payload.admin_notes = adminNotes
  const { data, error } = await getSupabaseBrowserClient()
    .from("venue_applications")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()
  handleError(error)
  return data as VenueApplicationRow
}

export type ApproveVenueResult = {
  success: boolean
  message?: string
  error?: string
}

/**
 * Approval goes through the `approve-venue` Edge Function, not a direct table
 * write: approving also invites the applicant as `venue_owner`, provisions the
 * draft venue, and flips the application status in one server-side transaction
 * the browser must not split up.
 */
export async function approveVenueApplication(
  applicationId: string,
): Promise<ApproveVenueResult> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient().functions.invoke(
    "approve-venue",
    { body: { application_id: applicationId } },
  )
  if (error) throw new Error(error.message || "The approval request failed.")
  const payload = (data ?? {}) as ApproveVenueResult
  if (payload && payload.error) throw new Error(payload.error)
  return { success: true, message: payload.message }
}

export type DatabaseSchema = Database
