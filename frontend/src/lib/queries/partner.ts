import type {
  BookingRow,
  BookingStatus,
  Json,
  ResourceInsert,
  ResourceRow,
  ResourceUpdate,
  SlotInsert,
  SlotRow,
  SlotStatus,
  UserRole,
  VenueInsert,
  VenueRow,
  VenueUpdate,
} from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import {
  getErrorMessage,
  readVenueImages,
  withVenueImages,
} from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* Select field lists — must match the columns that actually exist            */
/* -------------------------------------------------------------------------- */

const venueFields =
  "id, owner_id, name, slug, description, address, coordinates, area_id, status, avg_rating, amenities, max_advance_booking_days, operating_hours, subscription_tier, created_at, updated_at"
const resourceFields =
  "id, venue_id, name, category, hourly_rate, metadata, parent_id, is_active, created_at, updated_at"
const slotFields = "id, court_id, date, start_time, end_time, status, held_by, held_until"
const partnerBookingFields =
  "id, booking_ref, slot_id, resource_id, venue_id, status, payment_status, total_charged, venue_payout_amount, start_time, end_time, created_at, updated_at"

export type VenueWithResources = VenueRow & { resources: ResourceRow[] }
/** @deprecated Pre-migration alias kept so older imports keep compiling. */
export type VenueWithCourts = VenueWithResources
export type PublicSlotRow = Omit<SlotRow, "held_by" | "held_until">
export type PartnerBookingRow = Omit<
  BookingRow,
  "customer_id" | "payment_gateway_ref" | "commission_amount_snapshot"
>

/** Venue-owner-writable columns. `status` is intentionally excluded. */
export type PartnerVenueValues = Omit<VenueInsert, "owner_id" | "status">
export type PartnerSlotValues = Pick<SlotInsert, "court_id" | "date" | "start_time" | "end_time">

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function requireConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("Connect Supabase before using live data.")
  }
}

function handleError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/**
 * `venues.amenities` is a jsonb bag that also stores the venue image list
 * (`amenities->'images'`, which is what `search_venues_nearby` reads back).
 * `readVenueImages` / `withVenueImages` live in `utils` so the customer app can
 * use the same reader for venue cards.
 */
export { readVenueImages, withVenueImages }

/* -------------------------------------------------------------------------- */
/* Venues                                                                      */
/* -------------------------------------------------------------------------- */

export async function fetchOwnedVenues(ownerId: string): Promise<VenueWithResources[]> {
  if (!isSupabaseConfigured()) return []
  const client = getSupabaseBrowserClient()
  const { data, error } = await client
    .from("venues")
    .select(venueFields)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
  handleError(error)
  const venues = (data ?? []) as VenueRow[]
  if (venues.length === 0) return []
  const { data: resourceData, error: resourceError } = await client
    .from("resources")
    .select(resourceFields)
    .in(
      "venue_id",
      venues.map((venue) => venue.id),
    )
    .order("name")
  handleError(resourceError)
  const resources = (resourceData ?? []) as ResourceRow[]
  return venues.map((venue) => ({
    ...venue,
    resources: resources.filter((resource) => resource.venue_id === venue.id),
  }))
}

export async function createVenue(
  ownerId: string,
  values: PartnerVenueValues,
): Promise<VenueRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("venues")
    .insert({ ...values, owner_id: ownerId, status: "draft" })
    .select(venueFields)
    .single()
  handleError(error)
  return data as VenueRow
}

export async function updateVenue(venueId: string, values: VenueUpdate): Promise<VenueRow> {
  requireConfigured()
  // Ownership is enforced by the `owners_update_own_venues` RLS policy, which
  // is the authorization boundary. No client-side owner check is needed.
  const { data, error } = await getSupabaseBrowserClient()
    .from("venues")
    .update(values)
    .eq("id", venueId)
    .select(venueFields)
    .single()
  handleError(error)
  return data as VenueRow
}

/**
 * `draft -> submitted` only. Every later transition (under_review, approved,
 * published, rejected, suspended, archived) is owned by the platform team, so
 * the client never writes those directly.
 */
export async function submitVenueForReview(venueId: string): Promise<VenueRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("venues")
    .update({ status: "submitted" })
    .eq("id", venueId)
    .eq("status", "draft")
    .select(venueFields)
    .single()
  handleError(error)
  return data as VenueRow
}

/* -------------------------------------------------------------------------- */
/* Resources (universal inventory: flat assets + nested rooms/zones)           */
/* -------------------------------------------------------------------------- */

/**
 * Creates one inventory row. `parent_id` is what makes a resource "nested":
 * leave it `null` for a flat asset (or a new room/zone), or pass a room's id to
 * place the asset inside that room. The customer never picks the specific row —
 * the storefront auto-assigns whichever row in the category is free.
 */
export async function createResource(values: ResourceInsert): Promise<ResourceRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("resources")
    .insert(values)
    .select(resourceFields)
    .single()
  handleError(error)
  return data as ResourceRow
}

export async function updateResource(
  resourceId: string,
  values: ResourceUpdate,
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

/** Remove an asset or room. Children cascade via the `parent_id` FK. */
export async function deleteResource(resourceId: string): Promise<void> {
  requireConfigured()
  const { error } = await getSupabaseBrowserClient()
    .from("resources")
    .delete()
    .eq("id", resourceId)
  handleError(error)
}

/* -------------------------------------------------------------------------- */
/* Slots / availability                                                        */
/* -------------------------------------------------------------------------- */

export async function fetchSlots(courtId: string, date: string): Promise<PublicSlotRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("slots")
    .select("id, court_id, date, start_time, end_time, status")
    .eq("court_id", courtId)
    .eq("date", date)
    .order("start_time")
  handleError(error)
  return (data ?? []) as PublicSlotRow[]
}

/** Owner schedule view needs the hold metadata to explain stuck slots. */
export async function fetchOwnerSlots(courtId: string, date: string): Promise<SlotRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("slots")
    .select(slotFields)
    .eq("court_id", courtId)
    .eq("date", date)
    .order("start_time")
  handleError(error)
  return (data ?? []) as SlotRow[]
}

/**
 * Bulk-generate inventory. Relies on the unique index on
 * `(court_id, date, start_time)` to make this idempotent, so re-running the
 * generator for the same day never duplicates slots.
 */
export async function createSlots(values: PartnerSlotValues[]): Promise<SlotRow[]> {
  requireConfigured()
  if (values.length === 0) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("slots")
    .upsert(values, { onConflict: "court_id,date,start_time", ignoreDuplicates: true })
    .select(slotFields)
  handleError(error)
  return (data ?? []) as SlotRow[]
}

/**
 * Owners may only move inventory between the operator-controlled states.
 * `held` and `booked` are never writable from the client: `held` is owned by
 * the `hold_slot` RPC and `booked` by the payment webhook.
 */
export type OwnerSlotStatus = Extract<SlotStatus, "available" | "blocked" | "maintenance">

export async function setOwnerSlotStatus(
  slotId: string,
  status: OwnerSlotStatus,
  expectedStatus: OwnerSlotStatus,
): Promise<SlotRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("slots")
    .update({ status })
    .eq("id", slotId)
    .eq("status", expectedStatus)
    .select(slotFields)
    .single()
  handleError(error)
  return data as SlotRow
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

export async function fetchOwnedBookings(ownerId: string): Promise<PartnerBookingRow[]> {
  const venues = await fetchOwnedVenues(ownerId)
  if (!isSupabaseConfigured() || venues.length === 0) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("bookings")
    .select(partnerBookingFields)
    .in(
      "venue_id",
      venues.map((venue) => venue.id),
    )
    .order("created_at", { ascending: false })
  handleError(error)
  return (data ?? []) as PartnerBookingRow[]
}

/**
 * Bookings for one venue on one date, for the timeline POS grid. Kept as its
 * own query so the walk-in view refreshes on its own cadence instead of
 * invalidating the owner's whole booking list.
 */
export async function fetchVenueBookings(
  venueId: string,
  date: string,
): Promise<PartnerBookingRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("bookings")
    .select(partnerBookingFields)
    .eq("venue_id", venueId)
    .neq("status", "cancelled_by_customer")
    .neq("status", "cancelled_by_venue")
    .order("created_at", { ascending: true })
  handleError(error)
  // Legacy (slot-based) bookings have no `start_time`; they are filtered out
  // of the timeline rather than guessed at. `date` filters the dynamic
  // start_time window below.
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`
  return ((data ?? []) as PartnerBookingRow[]).filter((booking) => {
    if (!booking.start_time) return false
    return booking.start_time >= dayStart && booking.start_time <= dayEnd
  })
}

export type WalkInBookingValues = {
  venueId: string
  resourceId: string
  /** `HH:MM` on `date`, local time. */
  startTime: string
  /** `HH:MM` on `date`, local time, strictly after `startTime`. */
  endTime: string
  date: string
  customerName?: string
}

/**
 * Rapid walk-in block. The timeline POS creates the booking record directly —
 * no Safepay session — which simply occupies the time on the grid. The signed-in
 * owner is recorded as `customer_id` because the `Customers can insert bookings`
 * RLS policy only allows inserts where `customer_id = auth.uid()`; the block
 * reserves the time, and the guest's name stays at the venue's door register.
 */
export async function createWalkInBooking(
  ownerId: string,
  values: WalkInBookingValues,
): Promise<PartnerBookingRow> {
  requireConfigured()
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase()
  const { data, error } = await getSupabaseBrowserClient()
    .from("bookings")
    .insert({
      booking_ref: `KHEL-W-${suffix}`,
      customer_id: ownerId,
      venue_id: values.venueId,
      resource_id: values.resourceId,
      slot_id: null,
      status: "confirmed",
      payment_status: "pending",
      total_charged: 0,
      venue_payout_amount: 0,
      commission_amount_snapshot: 0,
      start_time: `${values.date}T${values.startTime}:00`,
      end_time: `${values.date}T${values.endTime}:00`,
    })
    .select(partnerBookingFields)
    .single()
  handleError(error)
  return data as PartnerBookingRow
}

/**
 * Venue owners may transition bookings out of `confirmed` only, matching the
 * `owners_update_own_venue_bookings` RLS policy.
 */
async function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
  expectedStatus: BookingStatus = "confirmed",
): Promise<PartnerBookingRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("status", expectedStatus)
    .select(partnerBookingFields)
    .single()
  handleError(error)
  return data as PartnerBookingRow
}

export function markBookingNoShow(bookingId: string): Promise<PartnerBookingRow> {
  return setBookingStatus(bookingId, "no_show")
}

export function markBookingCompleted(bookingId: string): Promise<PartnerBookingRow> {
  return setBookingStatus(bookingId, "completed")
}

export function cancelBookingByVenue(bookingId: string): Promise<PartnerBookingRow> {
  return setBookingStatus(bookingId, "cancelled_by_venue")
}

/* -------------------------------------------------------------------------- */
/* Venue team                                                                  */
/* -------------------------------------------------------------------------- */

export type TeamMemberProfile = {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  role: UserRole
}

export type OwnedTeamMember = {
  id: string
  venue_id: string
  venue_name: string
  user_id: string
  permissions: Json
  created_at: string | null
  member: TeamMemberProfile | null
}

/**
 * Team members across the owner's venues, joined to `profiles` for name/email.
 * Read-only: adding/removing members is intentionally deferred to a backend Edge
 * Function so invitation + account creation stay server-side (see task list).
 */
export async function fetchOwnedTeamMembers(ownerId: string): Promise<OwnedTeamMember[]> {
  const venues = await fetchOwnedVenues(ownerId)
  if (!isSupabaseConfigured() || venues.length === 0) return []
  const venueNames = new Map(venues.map((venue) => [venue.id, venue.name]))
  const { data, error } = await getSupabaseBrowserClient()
    .from("venue_team")
    .select(
      "id, venue_id, user_id, permissions, created_at, member:profiles ( id, name, email, avatar_url, role )",
    )
    .in(
      "venue_id",
      venues.map((venue) => venue.id),
    )
    .order("created_at", { ascending: true })
  handleError(error)
  type RawTeamRow = {
    id: string
    venue_id: string
    user_id: string
    permissions: Json
    created_at: string | null
    member: TeamMemberProfile | null
  }
  return ((data ?? []) as RawTeamRow[]).map((row) => ({
    ...row,
    venue_name: venueNames.get(row.venue_id) ?? "Venue",
  }))
}

export type InviteTeamMemberValues = {
  email: string
  venueId: string
  permissions: string[]
}

export type InviteTeamMemberResult = {
  success: boolean
  message?: string
}

/**
 * Invites a teammate through the `invite-team-member` Edge Function. The
 * function verifies the caller owns `venue_id`, creates the auth invite, and
 * upserts the `venue_team` row — none of which the browser may split up.
 */
export async function inviteTeamMember(
  values: InviteTeamMemberValues,
): Promise<InviteTeamMemberResult> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient().functions.invoke(
    "invite-team-member",
    {
      body: {
        email: values.email.trim(),
        venue_id: values.venueId,
        permissions: values.permissions,
      },
    },
  )
  if (error) throw new Error(error.message || "The invite request failed.")
  const payload = (data ?? {}) as InviteTeamMemberResult & { error?: string }
  if (payload.error) throw new Error(payload.error)
  return { success: true, message: payload.message ?? "Team member invited." }
}

/* -------------------------------------------------------------------------- */
/* Cloudinary signed upload (edge function `sign-cloudinary-upload`)            */
/* -------------------------------------------------------------------------- */

export type CloudinarySignature = {
  signature: string
  timestamp: number
  api_key: string
  cloud_name: string
  folder?: string
}

export type UploadResult = {
  secure_url: string
  public_id?: string
}

/**
 * Step 1 of the documented upload flow: ask the backend Edge Function to sign
 * the request. Only the signature and public API key ever reach the browser;
 * the Cloudinary secret stays server-side.
 */
export async function requestUploadSignature(
  folder: string,
): Promise<CloudinarySignature> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient().functions.invoke(
    "sign-cloudinary-upload",
    { body: { folder } },
  )
  if (error) throw new Error(error.message)
  if (!data || typeof data !== "object") {
    throw new Error("Could not start the upload. Please try again.")
  }
  return data as CloudinarySignature
}

/** Step 2: POST the file straight to Cloudinary using the signed values. */
export async function uploadImageToCloudinary(
  file: File,
  folder: string,
): Promise<UploadResult> {
  const signed = await requestUploadSignature(folder)
  const body = new FormData()
  body.append("file", file)
  body.append("api_key", signed.api_key)
  body.append("timestamp", String(signed.timestamp))
  body.append("signature", signed.signature)
  body.append("folder", signed.folder ?? folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloud_name}/image/upload`,
    { method: "POST", body },
  )
  if (!response.ok) {
    throw new Error("The image upload failed. Please try another file.")
  }
  const payload = (await response.json()) as { secure_url?: string; public_id?: string }
  if (!payload.secure_url) {
    throw new Error("The image upload returned no URL. Please try again.")
  }
  return { secure_url: payload.secure_url, public_id: payload.public_id }
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export function formatQueryError(error: unknown): string {
  return getErrorMessage(error)
}
