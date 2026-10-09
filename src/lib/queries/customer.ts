import type {
  BookingRow,
  BookingStatus,
  CourtRow,
  Database,
  HoldSlotResult,
  NearbyVenueRow,
  PaymentStatus,
  SlotRow,
  SlotStatus,
  VenueRow,
} from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import { getErrorMessage, getHoldSlotErrorMessage, readVenueImages } from "@/lib/utils"

export type VenueFilters = {
  search?: string
  sport?: string
}

export type PublicVenueRow = Omit<VenueRow, "owner_id">
export type PublicVenueWithCourts = PublicVenueRow & {
  courts: CourtRow[]
}
export type PublicSlotRow = Omit<SlotRow, "held_by" | "held_until">
export type CustomerBookingRow = Omit<
  BookingRow,
  "payment_gateway_ref" | "venue_payout_amount" | "commission_amount_snapshot"
>
export type BookingActionRow = Omit<
  BookingRow,
  "customer_id" | "payment_gateway_ref" | "venue_payout_amount" | "commission_amount_snapshot"
>

/** A public venue plus its PostGIS distance from the user's coordinates. */
export type NearbyVenue = PublicVenueWithCourts & {
  distanceKm: number
  images: string[]
}

const publicVenueFields =
  "id, name, slug, description, address, coordinates, area_id, status, avg_rating, amenities, created_at, updated_at"
/** `courts` has no `sport_id` column; `sport_type` is the only sport field. */
const courtFields =
  "id, venue_id, name, sport_type, hourly_rate, metadata, created_at, updated_at"
const publicSlotFields =
  "id, court_id, date, start_time, end_time, status"
const customerBookingFields =
  "id, booking_ref, customer_id, slot_id, court_id, venue_id, status, payment_status, total_charged, created_at, updated_at"
const bookingActionFields =
  "id, booking_ref, slot_id, court_id, venue_id, status, payment_status, total_charged, created_at, updated_at"

function requireConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("Connect Supabase before using live data.")
  }
}

function handleError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

function attachCourts(
  venues: PublicVenueRow[],
  courts: CourtRow[],
): PublicVenueWithCourts[] {
  return venues.map((venue) => ({
    ...venue,
    courts: courts.filter((court) => court.venue_id === venue.id),
  }))
}

/* -------------------------------------------------------------------------- */
/* Venues (public marketplace)                                                  */
/* -------------------------------------------------------------------------- */

export async function fetchPublishedVenues(
  filters: VenueFilters = {},
): Promise<PublicVenueWithCourts[]> {
  if (!isSupabaseConfigured()) return []
  const client = getSupabaseBrowserClient()
  let request = client
    .from("venues")
    .select(publicVenueFields)
    .eq("status", "published")
    .order("avg_rating", { ascending: false })
  const search = filters.search?.trim()
  if (search) {
    // PostgREST `or` takes a comma separated filter list, so commas, percent
    // signs, and parentheses are stripped from user input to avoid injection
    // through the filter string and to keep the pattern valid.
    const safeSearch = search.replace(/[,%()]/g, " ")
    request = request.or(`name.ilike.%${safeSearch}%,address.ilike.%${safeSearch}%`)
  }
  const { data, error } = await request
  handleError(error)
  const venues = (data ?? []) as PublicVenueRow[]
  if (venues.length === 0) return []
  const { data: courtData, error: courtError } = await client
    .from("courts")
    .select(courtFields)
    .in(
      "venue_id",
      venues.map((venue) => venue.id),
    )
  handleError(courtError)
  return attachCourts(venues, (courtData ?? []) as CourtRow[]).filter((venue) => {
    if (!filters.sport) return true
    return venue.courts.some(
      (court) => court.sport_type?.toLowerCase() === filters.sport?.toLowerCase(),
    )
  })
}

/**
 * Spatial discovery via `public.search_venues_nearby`
 * (migration 20260925141031). The RPC returns published venues within the
 * radius, already ordered by `distance_km`, plus the image list it reads from
 * `amenities->'images'`. Courts are hydrated separately because the RPC does
 * not return them.
 */
export async function fetchNearbyVenues(input: {
  lat: number
  lon: number
  radiusKm: number
}): Promise<NearbyVenue[]> {
  if (!isSupabaseConfigured()) return []
  const client = getSupabaseBrowserClient()
  const { data, error } = await client.rpc("search_venues_nearby", {
    p_lat: input.lat,
    p_lon: input.lon,
    p_radius_km: input.radiusKm,
  })
  handleError(error)
  const rows = (data ?? []) as NearbyVenueRow[]
  if (rows.length === 0) return []
  const { data: venueData, error: venueError } = await client
    .from("venues")
    .select(publicVenueFields)
    .in(
      "id",
      rows.map((row) => row.id),
    )
  handleError(venueError)
  const venuesById = new Map(
    ((venueData ?? []) as PublicVenueRow[]).map((venue) => [venue.id, venue]),
  )
  const ordered = rows
    .map((row) => ({ row, venue: venuesById.get(row.id) }))
    .filter((entry): entry is { row: NearbyVenueRow; venue: PublicVenueRow } =>
      Boolean(entry.venue),
    )
  if (ordered.length === 0) return []
  const { data: courtData, error: courtError } = await client
    .from("courts")
    .select(courtFields)
    .in(
      "venue_id",
      ordered.map((entry) => entry.venue.id),
    )
  handleError(courtError)
  const allCourts = (courtData ?? []) as CourtRow[]
  return ordered.map(({ row, venue }) => ({
    ...venue,
    courts: allCourts.filter((court) => court.venue_id === venue.id),
    distanceKm: Number(row.distance_km),
    // The RPC already projects `amenities->'images'`, so read that column and
    // only fall back to the raw jsonb bag if it is missing.
    images: Array.isArray(row.images) ? toStringList(row.images) : readVenueImages(row.amenities),
  }))
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.length > 0)
}

export async function fetchVenueBySlug(
  slug: string,
): Promise<PublicVenueWithCourts | null> {
  if (!isSupabaseConfigured()) return null
  const client = getSupabaseBrowserClient()
  const { data, error } = await client
    .from("venues")
    .select(publicVenueFields)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()
  handleError(error)
  if (!data) return null
  const venue = data as PublicVenueRow
  const { data: courtData, error: courtError } = await client
    .from("courts")
    .select(courtFields)
    .eq("venue_id", venue.id)
    .order("name")
  handleError(courtError)
  return { ...venue, courts: (courtData ?? []) as CourtRow[] }
}

/* -------------------------------------------------------------------------- */
/* Slots                                                                        */
/* -------------------------------------------------------------------------- */

export async function fetchSlots(
  courtId: string,
  date: string,
  status?: SlotStatus,
): Promise<PublicSlotRow[]> {
  if (!isSupabaseConfigured()) return []
  let request = getSupabaseBrowserClient()
    .from("slots")
    .select(publicSlotFields)
    .eq("court_id", courtId)
    .eq("date", date)
  if (status) request = request.eq("status", status)
  const { data, error } = await request.order("start_time")
  handleError(error)
  return (data ?? []) as PublicSlotRow[]
}

/**
 * `public.hold_slot` (migration 20260925123004) is the only supported way to
 * reserve inventory. It returns `RETURNS TABLE (slot_id, held_until)`, so the
 * caller keeps its own copy of the selected public slot and only the hold id
 * and backend-issued expiry come back from the call.
 *
 * Raises `Slot is not available`, `Not authenticated`, or
 * `freemium_limit_reached`; the messages are mapped for display.
 */
export async function holdSlot(input: {
  courtId: string
  date: string
  startTime: string
}): Promise<HoldSlotResult> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient().rpc("hold_slot", {
    p_court_id: input.courtId,
    p_date: input.date,
    p_start_time: input.startTime,
  })
  if (error) throw new Error(getHoldSlotErrorMessage(error.message))
  const result = (data ?? []) as HoldSlotResult[]
  const held = result[0]
  if (!held) throw new Error("Slot is not available")
  return held
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchCustomerBookings(userId: string): Promise<CustomerBookingRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("bookings")
    .select(customerBookingFields)
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
  handleError(error)
  return (data ?? []) as CustomerBookingRow[]
}

async function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
  expectedStatus: BookingStatus,
): Promise<BookingActionRow> {
  requireConfigured()
  const { data, error } = await getSupabaseBrowserClient()
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("status", expectedStatus)
    .select(bookingActionFields)
    .single()
  handleError(error)
  return data as BookingActionRow
}

export function cancelCustomerBooking(bookingId: string): Promise<BookingActionRow> {
  return setBookingStatus(bookingId, "cancelled_by_customer", "confirmed")
}

export type BookingFilters = {
  status?: BookingStatus
  paymentStatus?: PaymentStatus
}

export type QueryError = { message: string }

export function formatQueryError(error: unknown): string {
  return getErrorMessage(error)
}

export type DatabaseSchema = Database
export type SlotStatusValue = SlotStatus
