"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  SubscriptionTier,
  UserRole,
  VenueStatus,
} from "@/lib/database.types"
import {
  fetchAllBookings,
  fetchAllCourts,
  fetchAllVenues,
  fetchProfiles,
  fetchReviewVenues,
  updateAppConfig,
  updateCourt,
  updateProfileRole,
  updateProfileTier,
  updateReviewStatus,
} from "@/lib/queries/admin"
import type { AppConfigValues } from "@/lib/queries/admin"

/* -------------------------------- queries -------------------------------- */

export function useReviewVenues() {
  return useQuery({
    queryKey: ["admin", "venues", "review"],
    queryFn: fetchReviewVenues,
  })
}

export function useAllVenues(status?: VenueStatus) {
  return useQuery({
    queryKey: ["admin", "venues", "all", status ?? "any"],
    queryFn: () => fetchAllVenues(status),
  })
}

export function useAllCourts() {
  return useQuery({
    queryKey: ["admin", "courts"],
    queryFn: fetchAllCourts,
  })
}

export function useUsers(role?: UserRole) {
  return useQuery({
    queryKey: ["admin", "users", role ?? "all"],
    queryFn: () => fetchProfiles(role),
  })
}

export function usePartners() {
  return useQuery({
    queryKey: ["admin", "users", "venue_owner"],
    queryFn: () => fetchProfiles("venue_owner"),
    staleTime: 0,
  })
}

export function useAllBookings() {
  return useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: fetchAllBookings,
  })
}

/* ------------------------------- mutations ------------------------------- */

function useAdminMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  invalidates: string[][],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const queryKey of invalidates) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}

export function useReviewStatusMutation() {
  return useAdminMutation<
    { venueId: string; expectedStatus: VenueStatus; status: VenueStatus },
    unknown
  >(
    ({ venueId, expectedStatus, status }) =>
      updateReviewStatus(venueId, expectedStatus, status),
    [["admin", "venues"]],
  )
}

export function useUpdateRoleMutation() {
  return useAdminMutation<{ userId: string; role: UserRole }, unknown>(
    ({ userId, role }) => updateProfileRole(userId, role),
    [["admin", "users"], ["auth", "profile"]],
  )
}

export function useUpdateTierMutation() {
  return useAdminMutation<{ userId: string; tier: SubscriptionTier }, unknown>(
    ({ userId, tier }) => updateProfileTier(userId, tier),
    [["admin", "users"]],
  )
}

export function useUpdateCourtMutation() {
  return useAdminMutation<
    {
      courtId: string
      values: { name?: string; sport_type?: string | null; hourly_rate?: number }
    },
    unknown
  >(({ courtId, values }) => updateCourt(courtId, values), [["admin", "courts"]])
}

export function useUpdateAppConfigMutation() {
  return useAdminMutation<AppConfigValues, unknown>(updateAppConfig, [
    ["app-config"],
  ])
}
