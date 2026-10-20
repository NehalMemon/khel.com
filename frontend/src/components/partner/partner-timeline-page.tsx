"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { VenueTimeline } from "@/components/partner/venue-timeline"
import { usePartnerVenues } from "@/hooks/use-partner-data"

export function PartnerTimelinePage() {
  const { profile } = useAuth()
  const venuesQuery = usePartnerVenues(profile?.id ?? null)
  const venues = venuesQuery.data ?? []

  return (
    <main className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Partner portal
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Timeline POS</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          See every reservation for the day and block walk-ins in a single tap.
        </p>
      </div>

      {venuesQuery.isPending ? <LoadingState label="Loading venues" /> : null}
      {venuesQuery.isError ? (
        <Notice tone="error" title="Could not load venues">
          {venuesQuery.error.message}
        </Notice>
      ) : null}
      {!venuesQuery.isPending && venues.length === 0 ? (
        <EmptyState
          title="Create a venue first"
          description="The front desk timeline runs on your venue's resources, so add a venue before opening it."
        />
      ) : null}
      {venues.length > 0 ? <VenueTimeline venues={venues} /> : null}
    </main>
  )
}
