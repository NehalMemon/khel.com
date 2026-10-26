import type { Database as GeneratedDatabase, Tables, TablesInsert, Enums, Json } from "@/types/database.types"

export type { Json } from "@/types/database.types"
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "@/types/database.types"

export type UserRole = Enums<"user_role">
export type SubscriptionTier = "free" | "premium"
export type VenueStatus = Enums<"venue_status">
export type SlotStatus = Enums<"slot_status">
export type BookingStatus = Enums<"booking_status">
export type PaymentStatus = Enums<"payment_status">
export type MediaStatus = Enums<"media_status">

export type ApplicationStatus = Enums<"application_status">
export type NotificationType = Enums<"notification_type">

/** Roles a public signup form is allowed to request. Admin and venue_owner roles are never self-service. */
export type PublicSignupRole = Extract<UserRole, "customer">

/**
 * `profiles.subscription_tier` is `TEXT` guarded by the
 * `chk_profiles_subscription_tier` CHECK constraint (`'free' | 'premium'`).
 * Supabase's generator emits plain `string` because it does not read CHECK
 * constraints, so we narrow it here to the real domain.
 */
export type ProfileRow = Omit<Tables<"profiles">, "subscription_tier"> & {
  subscription_tier: SubscriptionTier
}
export type ProfileInsert = Omit<TablesInsert<"profiles">, "subscription_tier"> & {
  subscription_tier?: SubscriptionTier
}
export type ProfileUpdate = Partial<Pick<ProfileInsert, "name" | "email" | "phone" | "avatar_url">>
export type ProfilePrivilegedUpdate = Partial<Pick<ProfileInsert, "name" | "email" | "phone" | "avatar_url" | "role" | "subscription_tier">>

export type VenueRow = Tables<"venues">
export type VenueInsert = TablesInsert<"venues">
export type VenueRecordUpdate = Partial<Omit<VenueInsert, "owner_id">>
export type VenueUpdate = Partial<Pick<VenueInsert, "name" | "slug" | "description" | "address" | "coordinates" | "area_id" | "amenities">>

/**
 * `resources` (migration 20261019140036) is the universal inventory table that
 * replaced `courts`. An adjacency list: a top-level row (`parent_id = null`) is
 * a standalone asset ("PC 1") or a composite zone ("VIP Room"), and a nested
 * row (`parent_id = <room id>`) is an asset inside that zone ("VIP PC 1").
 * `category` (renamed from `sport_type`) is the customer-facing grouping label.
 */
export type ResourceRow = Tables<"resources">
export type ResourceInsert = TablesInsert<"resources">
export type ResourceUpdate = Partial<Omit<ResourceInsert, "venue_id">>

/** Venue-owner-writable resource columns. */
export type ResourceValues = Pick<ResourceInsert, "name" | "category" | "hourly_rate"> & {
  parent_id?: string | null
  is_active?: boolean
  metadata?: Json
}

/** `resources.parent_id` resolved to the parent resource row (or null). */
export type ResourceWithChildren = ResourceRow & { children: ResourceRow[] }

/**
 * Optional `resources.metadata` keys owned by the Pro tier. Kept as a narrow
 * reader so the UI can gate advanced pricing packages behind
 * `venues.subscription_tier === 'pro'`.
 */
export type ResourceMetadata = {
  capacity?: number
  booking_model?: string
  night_owl_pricing?: Json
  duration_discounts?: Json
  [key: string]: Json | undefined
}

export type SlotRow = Tables<"slots">
export type SlotInsert = TablesInsert<"slots">
export type SlotRecordUpdate = Partial<Omit<SlotInsert, "court_id">>
export type SlotUpdate = Partial<Pick<SlotInsert, "date" | "start_time" | "end_time" | "status">>

export type HoldLogRow = Tables<"hold_logs">
export type AppConfigRow = Tables<"app_config">

export type BookingRow = Tables<"bookings">
export type BookingInsert = TablesInsert<"bookings">
export type BookingUpdate = Partial<Pick<BookingInsert, "status">>

export type VenueTeamRow = Tables<"venue_team">
export type VenueTeamInsert = TablesInsert<"venue_team">
export type VenueTeamUpdate = Partial<Pick<VenueTeamInsert, "permissions">>

export type VenueApplicationRow = Tables<"venue_applications">
export type VenueApplicationInsert = TablesInsert<"venue_applications">
export type VenueApplicationUpdate = Partial<
  Pick<VenueApplicationInsert, "applicant_name" | "email" | "phone" | "venue_name" | "venue_address" | "status" | "admin_notes">
>

export type NotificationRow = Tables<"notifications">
export type NotificationInsert = TablesInsert<"notifications">
export type NotificationUpdate = Partial<Pick<NotificationInsert, "is_read">>

export type NearbyVenueRow = GeneratedDatabase["public"]["Functions"]["search_venues_nearby"]["Returns"][number]
export type HoldSlotResult = GeneratedDatabase["public"]["Functions"]["hold_slot"]["Returns"][number]

export const HOLD_SLOT_ERRORS = {
  notAvailable: "Slot is not available",
  freemiumLimit: "freemium_limit_reached",
  notAuthenticated: "Not authenticated",
} as const
