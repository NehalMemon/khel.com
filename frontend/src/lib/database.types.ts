import type { Database as GeneratedDatabase, Tables, TablesInsert, Enums } from "@/types/database.types"

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

/** Roles a public signup form is allowed to request. Admin roles are never self-service. */
export type PublicSignupRole = Extract<UserRole, "customer" | "venue_owner">

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

export type CourtRow = Tables<"courts">
export type CourtInsert = TablesInsert<"courts">
export type CourtUpdate = Partial<Omit<CourtInsert, "venue_id">>

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
