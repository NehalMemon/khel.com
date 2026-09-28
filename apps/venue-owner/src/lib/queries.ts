import type {
  BookingRow,
  BookingStatus,
  CourtInsert,
  CourtRow,
  CourtUpdate,
  ProfileRow,
  ProfileUpdate,
  SlotInsert,
  SlotRow,
  SlotStatus,
  VenueInsert,
  VenueRow,
  VenueUpdate,
} from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import {
  getErrorMessage,
  isPendingPhone,
  readVenueImages,
  withVenueImages,
} from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* Select field lists — must match the columns that actually exist            */
/* -------------------------------------------------------------------------- */

const venueFields =
  "id, owner_id, name, slug, description, address, coordinates, area_id, status, avg_rating, amenities, created_at, updated_at"
const courtFields =
  "id, venue_id, name, sport_type, hourly_rate, metadata, created_at, updated_at"
const slotFields = "id, court_id, date, start_time, end_time, status, held_by, held_until"
const partnerBookingFields =
  "id, booking_ref, slot_id, court_id, venue_id, status, payment_status, total_charged, venue_payout_amount, created_at, updated_at"
const profileFields =
  "id, name, phone, avatar_url, role, subscription_tier, created_at, updated_at"

export type VenueWithCourts = VenueRow & { courts: CourtRow[] }
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
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

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

export async function updateProfile(
  userId: string,
  values: ProfileUpdate,
): Promise<ProfileRow> {
  requireConfigured()
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

/* -------------------------------------------------------------------------- */
/* Venues                                                                      */
/* -------------------------------------------------------------------------- */

export async function fetchOwnedVenues(ownerId: string): Promise<VenueWithCourts[]> {
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
  const { data: courtData, error: courtError } = await client
    .from("courts")
    .select(courtFields)
    .in(
      "venue_id",
      venues.map((venue) => venue.id),
    )
    .order("name")
  handleError(courtError)
  const courts = (courtData ?? []) as CourtRow[]
  return venues.map((venue) => ({
    ...venue,
    courts: courts.filter((court) => court.venue_id === venue.id),
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
/* Courts                                                                      */
/* -------------------------------------------------------------------------- */

export async function createCourt(values: CourtInsert): Promise<CourtRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("courts")
    .insert(values)
    .select(courtFields)
    .single()
  handleError(error)
  return data as CourtRow
}

export async function updateCourt(courtId: string, values: CourtUpdate): Promise<CourtRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("courts")
    .update(values)
    .eq("id", courtId)
    .select(courtFields)
    .single()
  handleError(error)
  return data as CourtRow
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
