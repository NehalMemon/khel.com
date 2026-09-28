"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ProfileUpdate } from "@/lib/database.types"
import {
  cancelCustomerBooking,
  fetchCustomerBookings,
  fetchNearbyVenues,
  fetchPublishedVenues,
  fetchSlots,
  fetchVenueBySlug,
  holdSlot,
  updateProfile,
  type VenueFilters,
} from "@/lib/queries"

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

export function useCustomerBookings(userId: string | null) {
  return useQuery({
    queryKey: ["bookings", "customer", userId],
    queryFn: () => fetchCustomerBookings(userId as string),
    enabled: Boolean(userId),
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
