"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ApplicationStatus,
  SubscriptionTier,
  UserRole,
  VenueStatus,
} from "@/lib/database.types"
import {
  approveVenueApplication,
  fetchAllBookings,
  fetchAllResources,
  fetchAllVenues,
  fetchProfiles,
  fetchReviewVenues,
  fetchVenueApplications,
  updateAppConfig,
  updateProfileRole,
  updateProfileTier,
  updateResource,
  updateReviewStatus,
  updateVenueApplicationStatus,
} from "@/lib/queries/admin"
import type { AppConfigValues, ApproveVenueResult } from "@/lib/queries/admin"

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

export function useAllResources() {
  return useQuery({
    queryKey: ["admin", "resources"],
    queryFn: fetchAllResources,
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

export function useUpdateResourceMutation() {
  return useAdminMutation<
    {
      resourceId: string
      values: { name?: string; category?: string | null; hourly_rate?: number }
    },
    unknown
  >(({ resourceId, values }) => updateResource(resourceId, values), [["admin", "resources"]])
}

export function useUpdateAppConfigMutation() {
  return useAdminMutation<AppConfigValues, unknown>(updateAppConfig, [
    ["app-config"],
  ])
}

export function useVenueApplications(status?: ApplicationStatus) {
  return useQuery({
    queryKey: ["admin", "venue_applications", status ?? "all"],
    queryFn: () => fetchVenueApplications(status),
  })
}

export function useUpdateVenueApplicationStatusMutation() {
  return useAdminMutation<
    { id: string; status: ApplicationStatus; adminNotes?: string },
    unknown
  >(
    ({ id, status, adminNotes }) =>
      updateVenueApplicationStatus(id, status, adminNotes),
    [["admin", "venue_applications"]],
  )
}

/**
 * Approval runs through the `approve-venue` Edge Function (invite + venue
 * provisioning + status flip happen server-side). Rejecting keeps using the
 * direct status mutation above, since there is nothing to orchestrate there.
 */
export function useApproveVenueApplicationMutation() {
  return useAdminMutation<string, ApproveVenueResult>(approveVenueApplication, [
    ["admin", "venue_applications"],
    ["admin", "venues"],
  ])
}
