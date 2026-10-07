"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CourtInsert,
  CourtUpdate,
  ProfileUpdate,
  VenueUpdate,
} from "@/lib/database.types"
import {
  cancelBookingByVenue,
  createCourt,
  createSlots,
  createVenue,
  fetchOwnedBookings,
  fetchOwnedVenues,
  fetchOwnerSlots,
  markBookingCompleted,
  markBookingNoShow,
  setOwnerSlotStatus,
  submitVenueForReview,
  updateCourt,
  updateVenue,
  uploadImageToCloudinary,
  type OwnerSlotStatus,
  type PartnerSlotValues,
  type PartnerVenueValues,
} from "@/lib/queries/partner"
import { updateProfile } from "@/lib/queries/profile"

/* -------------------------------- queries -------------------------------- */

export function usePartnerVenues(ownerId: string | null) {
  return useQuery({
    queryKey: ["partner", "venues", ownerId],
    queryFn: () => fetchOwnedVenues(ownerId as string),
    enabled: Boolean(ownerId),
  })
}

export function usePartnerBookings(ownerId: string | null) {
  return useQuery({
    queryKey: ["partner", "bookings", ownerId],
    queryFn: () => fetchOwnedBookings(ownerId as string),
    enabled: Boolean(ownerId),
  })
}

/**
 * Owner schedule view. Uses the full slot row (not the public projection) so
 * the portal can show when a held slot expires while stale-hold cleanup is
 * still a backend open item.
 */
export function useSlots(courtId: string | null, date: string) {
  return useQuery({
    queryKey: ["partner", "slots", courtId, date],
    queryFn: () => fetchOwnerSlots(courtId as string, date),
    enabled: Boolean(courtId && date),
  })
}

/* ------------------------------- mutations ------------------------------- */

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

export function useCreateVenueMutation(ownerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PartnerVenueValues) => createVenue(ownerId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner"] })
    },
  })
}

export function useUpdateVenueMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ venueId, values }: { venueId: string; values: VenueUpdate }) =>
      updateVenue(venueId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner"] })
    },
  })
}

export function useSubmitVenueMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (venueId: string) => submitVenueForReview(venueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner"] })
    },
  })
}

export function useCreateCourtMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CourtInsert) => createCourt(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner"] })
    },
  })
}

export function useUpdateCourtMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ courtId, values }: { courtId: string; values: CourtUpdate }) =>
      updateCourt(courtId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner"] })
    },
  })
}

export function useCreateSlotsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PartnerSlotValues[]) => createSlots(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner"] })
    },
  })
}

export function useSetPartnerSlotStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      slotId,
      status,
      expectedStatus,
    }: {
      slotId: string
      status: OwnerSlotStatus
      expectedStatus: OwnerSlotStatus
    }) => setOwnerSlotStatus(slotId, status, expectedStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner", "slots"] })
    },
  })
}

function usePartnerBookingAction(
  mutationFn: (bookingId: string) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner", "bookings"] })
    },
  })
}

export function useMarkPartnerBookingNoShowMutation() {
  return usePartnerBookingAction(markBookingNoShow)
}

export function useMarkPartnerBookingCompletedMutation() {
  return usePartnerBookingAction(markBookingCompleted)
}

export function useCancelPartnerBookingMutation() {
  return usePartnerBookingAction(cancelBookingByVenue)
}

/* ------------------------- venue image uploads --------------------------- */

export function useVenueImageUploadMutation() {
  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder: string }) =>
      uploadImageToCloudinary(file, folder),
  })
}
