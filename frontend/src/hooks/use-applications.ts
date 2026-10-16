"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchPendingApplications,
  submitVenueApplication,
  type VenueApplicationValues,
} from "@/lib/queries/applications"

/* -------------------------------- queries -------------------------------- */

/** Admin review queue. Relies on the admin-only SELECT policy on `venue_applications`. */
export function useVenueApplications() {
  return useQuery({
    queryKey: ["admin", "applications", "pending"],
    queryFn: fetchPendingApplications,
  })
}

/* ------------------------------- mutations ------------------------------- */

/** Public onboarding intake — anonymous visitors have no cache to invalidate. */
export function useSubmitVenueApplicationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: VenueApplicationValues) => submitVenueApplication(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "applications"] })
    },
  })
}
