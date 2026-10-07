/**
 * Hand-maintained mirror of the Supabase schema.
 *
 * Source of truth: `supabase/migrations/*.sql` and `doc/SCHEMA.md`.
 * Regenerate with `supabase gen types typescript` after any new migration; do not
 * hand-add columns that no migration creates.
 *
 * Verified against migrations:
 *   profiles  : + subscription_tier (migration 20260925123004)
 *   courts    : NO `sport_id` column exists in any migration
 *   app_config: migration 20260925142542
 *   hold_logs : migration 20260925123004
 *   hold_slot : RETURNS TABLE (slot_id UUID, held_until TIMESTAMPTZ)
 *   confirm_booking_with_payment: (p_booking_id, p_gateway_ref, p_amount_paid) RETURNS TEXT
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  | "customer"
  | "venue_owner"
  | "venue_staff"
  | "admin"
  | "super_admin"

export type SubscriptionTier = "free" | "premium"

export type VenueStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "published"
  | "rejected"
  | "suspended"
  | "archived"

export type SlotStatus =
  | "available"
  | "held"
  | "booked"
  | "blocked"
  | "maintenance"

export type BookingStatus =
  | "confirmed"
  | "completed"
  | "cancelled_by_customer"
  | "cancelled_by_venue"
  | "no_show"

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

export type MediaStatus = "pending" | "approved" | "rejected"

/** Roles a public signup form is allowed to request. Admin roles are never self-service. */
export type PublicSignupRole = Extract<UserRole, "customer" | "venue_owner">

export type ProfileRow = {
  id: string
  name: string
  phone: string
  avatar_url: string | null
  role: UserRole
  subscription_tier: SubscriptionTier
  created_at: string
  updated_at: string
}

export type ProfileInsert = {
  id: string
  name: string
  phone: string
  avatar_url?: string | null
  role?: UserRole
  subscription_tier?: SubscriptionTier
  created_at?: string
  updated_at?: string
}

/**
 * Self-service update. `role` and `subscription_tier` are deliberately absent:
 * the `trg_protect_profile_tier_and_role` trigger silently reverts unauthorized
 * changes to those columns, and customer/owner profile forms must never offer
 * to write them.
 */
export type ProfileUpdate = Partial<Pick<ProfileInsert, "name" | "phone" | "avatar_url">>

/**
 * Admin-console update. The same trigger still guards these writes, but it
 * permits platform admins, so the operations console is allowed to change role
 * and tier on behalf of support and finance staff.
 */
export type ProfilePrivilegedUpdate = Partial<
  Pick<ProfileInsert, "name" | "phone" | "avatar_url" | "role" | "subscription_tier">
>

export type AppConfigRow = {
  id: number
  commission_rate: number
  default_search_radius_km: number
  hold_expiry_minutes: number
  updated_at: string
}

export type VenueRow = {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  address: string
  coordinates: unknown
  area_id: string | null
  status: VenueStatus
  avg_rating: number
  amenities: Json
  created_at: string
  updated_at: string
}

export type VenueInsert = {
  owner_id: string
  name: string
  slug: string
  description?: string | null
  address: string
  coordinates: unknown
  area_id?: string | null
  status?: VenueStatus
  avg_rating?: number
  amenities?: Json
  created_at?: string
  updated_at?: string
}

export type VenueRecordUpdate = Partial<Omit<VenueInsert, "owner_id">>

/** `status` is absent: status transitions are backend-owned, not a free-form column write. */
export type VenueUpdate = Partial<
  Pick<VenueInsert, "name" | "slug" | "description" | "address" | "coordinates" | "area_id" | "amenities">
>

export type CourtRow = {
  id: string
  venue_id: string
  name: string
  sport_type: string | null
  hourly_rate: number
  metadata: Json
  created_at: string
  updated_at: string
}

export type CourtInsert = {
  venue_id: string
  name: string
  sport_type?: string | null
  hourly_rate: number
  metadata?: Json
  created_at?: string
  updated_at?: string
}

export type CourtUpdate = Partial<Omit<CourtInsert, "venue_id">>

export type SlotRow = {
  id: string
  court_id: string
  date: string
  start_time: string
  end_time: string
  status: SlotStatus
  held_by: string | null
  held_until: string | null
}

export type SlotInsert = {
  court_id: string
  date: string
  start_time: string
  end_time: string
  status?: SlotStatus
  held_by?: string | null
  held_until?: string | null
}

export type SlotRecordUpdate = Partial<Omit<SlotInsert, "court_id">>
export type SlotUpdate = Partial<Pick<SlotInsert, "date" | "start_time" | "end_time" | "status">>

export type HoldLogRow = {
  id: string
  user_id: string
  slot_id: string
  created_at: string
}

export type BookingRow = {
  id: string
  booking_ref: string
  customer_id: string
  slot_id: string | null
  court_id: string
  venue_id: string
  status: BookingStatus
  payment_status: PaymentStatus
  payment_gateway_ref: string | null
  total_charged: number
  venue_payout_amount: number
  commission_amount_snapshot: number
  created_at: string
  updated_at: string
}

export type BookingInsert = {
  id?: string
  booking_ref: string
  customer_id: string
  slot_id?: string | null
  court_id: string
  venue_id: string
  status?: BookingStatus
  payment_status?: PaymentStatus
  payment_gateway_ref?: string | null
  total_charged: number
  venue_payout_amount: number
  commission_amount_snapshot?: number
  created_at?: string
  updated_at?: string
}

export type BookingUpdate = Partial<Pick<BookingInsert, "status">>

/** Exact return shape of `public.search_venues_nearby`. */
export type NearbyVenueRow = {
  id: string
  name: string
  slug: string
  address: string
  avg_rating: number
  amenities: Json
  images: Json
  distance_km: number
}

/** Exact return shape of `public.hold_slot` (RETURNS TABLE -> always an array). */
export type HoldSlotResult = {
  slot_id: string
  held_until: string
}

/** Thrown by `public.hold_slot`; mapped to specific UI in the booking flow. */
export const HOLD_SLOT_ERRORS = {
  notAvailable: "Slot is not available",
  freemiumLimit: "freemium_limit_reached",
  notAuthenticated: "Not authenticated",
} as const

type TableDefinition<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow, ProfileInsert, ProfilePrivilegedUpdate>
      app_config: TableDefinition<AppConfigRow, AppConfigRow, Partial<AppConfigRow>>
      venues: TableDefinition<VenueRow, VenueInsert, VenueRecordUpdate>
      courts: TableDefinition<CourtRow, CourtInsert, CourtUpdate>
      slots: TableDefinition<SlotRow, SlotInsert, SlotRecordUpdate>
      hold_logs: TableDefinition<HoldLogRow, HoldLogRow, Partial<HoldLogRow>>
      bookings: TableDefinition<BookingRow, BookingInsert, BookingUpdate>
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      hold_slot: {
        Args: { p_court_id: string; p_date: string; p_start_time: string }
        Returns: HoldSlotResult[]
      }
      search_venues_nearby: {
        Args: { p_lat: number; p_lon: number; p_radius_km: number }
        Returns: NearbyVenueRow[]
      }
      /** Webhook-only. Never call this from the client. */
      confirm_booking_with_payment: {
        Args: { p_booking_id: string; p_gateway_ref: string; p_amount_paid: number }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      venue_status: VenueStatus
      slot_status: SlotStatus
      booking_status: BookingStatus
      payment_status: PaymentStatus
      media_status: MediaStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Row"]

export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Insert"]

export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Update"]

export type Enums<EnumName extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][EnumName]
