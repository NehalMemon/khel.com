"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ProfileUpdate } from "@/lib/database.types"
import {
  cancelCustomerBooking,
  fetchAvailableTimeChips,
  fetchCustomerBookingByRef,
  fetchCustomerBookings,
  fetchHoldLogs,
  fetchHoldLogsCountThisWeek,
  fetchNearbyVenues,
  fetchPublishedVenues,
  fetchSlots,
  fetchSlotsForCourts,
  fetchVenueBySlug,
  fetchVenueResources,
  holdSlot,
  type AvailableTimeChip,
  type HoldLogRow,
  type VenueFilters,
} from "@/lib/queries/customer"
import { updateProfile } from "@/lib/queries/profile"

/* ------------------------------- queries -------------------------------- */

export function usePublishedVenues(filters: VenueFilters = {}) {
  return useQuery({
    queryKey: ["venues", "published", filters],
    queryFn: () => fetchPublishedVenues(filters),
  })
}

/**
 * Spatial discovery. `origin` is resolved by `useUserOrigin`, which falls back
 * to the documented central Karachi coordinates when the browser prompt is
 * declined. `radiusKm` always comes from `app_config`.
 */
export function useNearbyVenues(
  origin: { lat: number; lon: number } | null,
  radiusKm: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["venues", "nearby", origin, radiusKm],
    queryFn: () => fetchNearbyVenues({ ...(origin as { lat: number; lon: number }), radiusKm }),
    enabled: Boolean(origin) && enabled,
    staleTime: 60_000,
  })
}

export function useVenue(slug: string) {
  return useQuery({
    queryKey: ["venues", "published", slug],
    queryFn: () => fetchVenueBySlug(slug),
    enabled: Boolean(slug),
  })
}

/** The venue's whole inventory tree (flat assets + rooms + nested assets). */
export function useVenueResources(venueId: string | null) {
  return useQuery({
    queryKey: ["resources", "venue", venueId],
    queryFn: () => fetchVenueResources(venueId as string),
    enabled: Boolean(venueId),
  })
}

export function useSlots(courtId: string | null, date: string) {
  return useQuery({
    queryKey: ["slots", courtId, date],
    queryFn: () => fetchSlots(courtId as string, date),
    enabled: Boolean(courtId && date),
  })
}

export function useAvailableSlots(courtId: string | null, date: string) {
  return useQuery({
    queryKey: ["slots", "available", courtId, date],
    queryFn: () => fetchSlots(courtId as string, date, "available"),
    enabled: Boolean(courtId && date),
  })
}

/**
 * One request for every court of a venue on a date. The booking page renders
 * availability across all courts from this single query, so it never fans out
 * into one `useAvailableSlots` per court.
 */
export function useAvailableSlotsForCourts(courtIds: string[], date: string) {
  const sortedIds = [...courtIds].sort()
  return useQuery({
    queryKey: ["slots", "available", "courts", sortedIds, date],
    queryFn: () => fetchSlotsForCourts(sortedIds, date, "available"),
    enabled: sortedIds.length > 0 && Boolean(date),
  })
}

export function useAvailableTimeChips(venueId: string | null, category: string | null, date: string) {
  return useQuery({
    queryKey: ["time-chips", venueId, category, date],
    queryFn: () =>
      fetchAvailableTimeChips({
        venueId: venueId as string,
        category: category as string,
        targetDate: date,
      }),
    enabled: Boolean(venueId && category && date),
  })
}

export function useHoldLogs(userId: string | null, limit = 10) {
  return useQuery({
    queryKey: ["hold-logs", userId, limit],
    queryFn: () => fetchHoldLogs(userId as string, limit),
    enabled: Boolean(userId),
  })
}

export function useHoldLogsCountThisWeek(userId: string | null) {
  return useQuery({
    queryKey: ["hold-logs", "count", "week", userId],
    queryFn: () => fetchHoldLogsCountThisWeek(userId as string),
    enabled: Boolean(userId),
  })
}

export function useCustomerBookings(userId: string | null) {
  return useQuery({
    queryKey: ["bookings", "customer", userId],
    queryFn: () => fetchCustomerBookings(userId as string),
    enabled: Boolean(userId),
  })
}

/**
 * A single booking by reference, for the confirmation page. The page polls this
 * itself (via `refetch`) while the payment is pending, so no interval lives here.
 */
export function useCustomerBookingByRef(userId: string | null, bookingRef: string) {
  return useQuery({
    queryKey: ["bookings", "customer", userId, "ref", bookingRef],
    queryFn: () => fetchCustomerBookingByRef(userId as string, bookingRef),
    enabled: Boolean(userId && bookingRef),
  })
}

/* ------------------------------ mutations ------------------------------- */

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: ProfileUpdate }) =>
      updateProfile(userId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "profile"] })
    },
  })
}

/** `hold_slot` returns the backend-issued `held_until`, never a client timer. */
export function useHoldSlotMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { courtId: string; date: string; startTime: string }) =>
      holdSlot(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["slots"] })
    },
  })
}

export function useCancelCustomerBookingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: string) => cancelCustomerBooking(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] })
    },
  })
}
