"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { ResourceDesigner } from "@/components/partner/resource-designer"
import { usePartnerVenues } from "@/hooks/use-partner-data"

export function PartnerResourcesPage() {
  const { profile } = useAuth()
  const venuesQuery = usePartnerVenues(profile?.id ?? null)
  const venues = venuesQuery.data ?? []

  return (
    <main className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Partner portal
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Resources</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Design what customers can book: standalone assets, or rooms and zones with
          assets nested inside them.
        </p>
      </div>

      {venuesQuery.isPending ? <LoadingState label="Loading inventory" /> : null}
      {venuesQuery.isError ? (
        <Notice tone="error" title="Could not load inventory">
          {venuesQuery.error.message}
        </Notice>
      ) : null}
      {!venuesQuery.isPending && venues.length === 0 ? (
        <EmptyState
          title="Create a venue first"
          description="Resources belong to a venue, so add your venue before designing its layout."
        />
      ) : null}
      {venues.length > 0 ? <ResourceDesigner venues={venues} /> : null}
    </main>
  )
}
