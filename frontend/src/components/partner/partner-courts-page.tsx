"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { CourtManager } from "@/components/partner/court-manager"
import { usePartnerVenues } from "@/hooks/use-partner-data"

export function PartnerCourtsPage() {
  const { profile } = useAuth()
  const venuesQuery = usePartnerVenues(profile?.id ?? null)
  const venues = venuesQuery.data ?? []

  return (
    <main className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Partner portal
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Courts</h1>
        <p className="mt-2 text-muted-foreground">
          Create and maintain the spaces players can book.
        </p>
      </div>

      {venuesQuery.isPending ? <LoadingState label="Loading courts" /> : null}
      {venuesQuery.isError ? (
        <Notice tone="error" title="Could not load courts">
          {venuesQuery.error.message}
        </Notice>
      ) : null}
      {!venuesQuery.isPending && venues.length === 0 ? (
        <EmptyState
          title="Create a venue first"
          description="Courts belong to a venue, so add your venue before adding a court."
        />
      ) : null}
      {venues.length > 0 ? <CourtManager venues={venues} /> : null}
    </main>
  )
}
