import type {
  BookingRow,
  BookingStatus,
  Database,
  HoldSlotResult,
  NearbyVenueRow,
  PaymentStatus,
  ResourceRow,
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
export type PublicVenueWithResources = PublicVenueRow & {
  resources: ResourceRow[]
}
/** @deprecated Pre-migration alias kept so older imports keep compiling. */
export type PublicVenueWithCourts = PublicVenueWithResources
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
export type NearbyVenue = PublicVenueWithResources & {
  distanceKm: number
  images: string[]
}

const publicVenueFields =
  "id, name, slug, description, address, coordinates, area_id, status, avg_rating, amenities, max_advance_booking_days, operating_hours, subscription_tier, created_at, updated_at"
/** Public resource fields; `category` is the display/grouping label. */
const resourceFields =
  "id, venue_id, name, category, hourly_rate, metadata, parent_id, is_active, created_at, updated_at"
const publicSlotFields =
  "id, court_id, date, start_time, end_time, status"
const customerBookingFields =
  "id, booking_ref, customer_id, slot_id, resource_id, venue_id, status, payment_status, total_charged, created_at, updated_at, start_time, end_time"
const bookingActionFields =
  "id, booking_ref, slot_id, resource_id, venue_id, status, payment_status, total_charged, created_at, updated_at, start_time, end_time"

function requireConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("Connect Supabase before using live data.")
  }
}

function handleError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

function attachResources(
  venues: PublicVenueRow[],
  resources: ResourceRow[],
): PublicVenueWithResources[] {
  return venues.map((venue) => ({
    ...venue,
    resources: resources.filter((resource) => resource.venue_id === venue.id),
  }))
}

/* -------------------------------------------------------------------------- */
/* Venues (public marketplace)                                                  */
/* -------------------------------------------------------------------------- */

export async function fetchPublishedVenues(
  filters: VenueFilters = {},
): Promise<PublicVenueWithResources[]> {
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
  const { data: resourceData, error: resourceError } = await client
    .from("resources")
    .select(resourceFields)
    .in(
      "venue_id",
      venues.map((venue) => venue.id),
    )
  handleError(resourceError)
  return attachResources(venues, (resourceData ?? []) as ResourceRow[]).filter((venue) => {
    if (!filters.sport) return true
    return venue.resources.some(
      (resource) => resource.category?.toLowerCase() === filters.sport?.toLowerCase(),
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
  const { data: resourceData, error: resourceError } = await client
    .from("resources")
    .select(resourceFields)
    .in(
      "venue_id",
      ordered.map((entry) => entry.venue.id),
    )
  handleError(resourceError)
  const allResources = (resourceData ?? []) as ResourceRow[]
  return ordered.map(({ row, venue }) => ({
    ...venue,
    resources: allResources.filter((resource) => resource.venue_id === venue.id),
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
): Promise<PublicVenueWithResources | null> {
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
  const { data: resourceData, error: resourceError } = await client
    .from("resources")
    .select(resourceFields)
    .eq("venue_id", venue.id)
    .order("name")
  handleError(resourceError)
  return { ...venue, resources: (resourceData ?? []) as ResourceRow[] }
}

/**
 * Every resource of a venue (flat assets + rooms + the assets nested inside
 * those rooms), in one request. The storefront groups the nested rows under
 * their parent for the "movie theater" category view, and the owner timeline
 * renders the same hierarchy.
 */
export async function fetchVenueResources(venueId: string): Promise<ResourceRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("resources")
    .select(resourceFields)
    .eq("venue_id", venueId)
    .order("name")
  handleError(error)
  return (data ?? []) as ResourceRow[]
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
 * Slots for every court of a venue on one date, in a single request.
 *
 * The booking page needs availability across all the venue's courts at once to
 * pick a default court and to render the grid, so it must not fall back to one
 * request per court. `court_id` is the only venue link on `slots`, so the filter
 * is an `in` over the venue's court ids.
 */
export async function fetchSlotsForCourts(
  courtIds: string[],
  date: string,
  status?: SlotStatus,
): Promise<PublicSlotRow[]> {
  if (!isSupabaseConfigured() || courtIds.length === 0) return []
  let request = getSupabaseBrowserClient()
    .from("slots")
    .select(publicSlotFields)
    .in("court_id", courtIds)
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

/**
 * A single booking by its `booking_ref`, scoped to the signed-in customer.
 * `booking_ref` is UNIQUE, and the `customer_id` filter keeps the row-level
 * policy honest even if a ref is guessed. The confirmation page polls this to
 * watch `payment_status` move from `pending` to `paid`/`failed`.
 */
export async function fetchCustomerBookingByRef(
  userId: string,
  bookingRef: string,
): Promise<CustomerBookingRow | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await getSupabaseBrowserClient()
    .from("bookings")
    .select(customerBookingFields)
    .eq("customer_id", userId)
    .eq("booking_ref", bookingRef)
    .maybeSingle()
  handleError(error)
  return (data ?? null) as CustomerBookingRow | null
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
