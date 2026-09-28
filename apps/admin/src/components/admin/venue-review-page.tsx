"use client"

import { useState } from "react"
import { CheckCircle2, CirclePlay, MapPin, Send, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Notice } from "@/components/app/notice"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { StatusBadge } from "@/components/app/status-badge"
import { useReviewStatusMutation, useReviewVenues } from "@/hooks/use-data"
import type { VenueStatus } from "@/lib/database.types"
import { formatDateTime, getErrorMessage, readVenueImages } from "@/lib/utils"

function formatAmenities(amenities: unknown): string {
  if (Array.isArray(amenities)) return amenities.filter((item): item is string => typeof item === "string").join(", ")
  if (amenities && typeof amenities === "object") {
    return Object.entries(amenities)
      .filter(([, enabled]) => enabled === true)
      .map(([name]) => name)
      .join(", ")
  }
  return "Not provided"
}

export function VenueReviewPage() {
  const venuesQuery = useReviewVenues()
  const statusMutation = useReviewStatusMutation()
  const [actionError, setActionError] = useState<string | null>(null)

  async function setStatus(venueId: string, expectedStatus: VenueStatus, status: VenueStatus) {
    setActionError(null)
    try {
      await statusMutation.mutateAsync({ venueId, expectedStatus, status })
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  if (venuesQuery.isPending) return <LoadingState label="Loading venue review queue" />
  if (venuesQuery.isError) return <Notice tone="error" title="Could not load review queue">{venuesQuery.error.message}</Notice>

  return (
    <div className="grid gap-6">
      <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Marketplace operations</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Venue review</h1><p className="mt-2 text-muted-foreground">Move submitted listings through review, approval, and publication.</p></div>
      {actionError ? <Notice tone="error" title="Could not update venue">{actionError}</Notice> : null}
      <Notice tone="info" title="Publication workflow">Submitted listings can enter review, then move to approved. Publication remains disabled until the backend transition contract is shipped.</Notice>
      {venuesQuery.data.length === 0 ? <EmptyState title="Review queue is clear" description="Submitted, under-review, and approved venues will appear here." /> : <div className="grid gap-4">{venuesQuery.data.map((venue) => {
        const actionsDisabled = statusMutation.isPending
        const images = readVenueImages(venue.amenities)
        return <Card key={venue.id}><CardHeader className="border-b"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><CardTitle>{venue.name}</CardTitle><StatusBadge status={venue.status} /></div><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" />{venue.address}</p></div><p className="text-xs text-muted-foreground">Updated {formatDateTime(venue.updated_at)}</p></div></CardHeader><CardContent className="grid gap-5 pt-5"><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</p><p className="mt-2 text-sm leading-6 text-foreground/80">{venue.description || "No description provided."}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Photos</p>{images.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No photos uploaded.</p> : <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">{images.map((src) => (
                  <li key={src}>
                    {/* Cloudinary is the only image host in the marketplace, but these
                        are small moderation thumbnails, so optimization is not worth it. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`${venue.name} listing photo`}
                      loading="lazy"
                      className="aspect-4/3 w-full rounded-lg border object-cover"
                    />
                  </li>
                ))}</ul>}</div><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Courts</p>{venue.courts.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No courts configured yet.</p> : <ul className="mt-2 flex flex-wrap gap-2">{venue.courts.map((court) => <li key={court.id} className="rounded-lg border px-3 py-1.5 text-sm"><span className="font-semibold">{court.name}</span><span className="ml-2 text-muted-foreground">{court.sport_type ?? "Unspecified sport"}</span></li>)}</ul>}</div><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amenities</p><p className="mt-2 text-sm">{formatAmenities(venue.amenities)}</p></div><div className="flex flex-wrap justify-end gap-2 border-t pt-5">{venue.status === "submitted" ? <Button variant="outline" disabled={actionsDisabled} onClick={() => setStatus(venue.id, "submitted", "under_review")}><CirclePlay />Start review</Button> : null}{venue.status === "under_review" ? <><Button variant="destructive" disabled={actionsDisabled} onClick={() => setStatus(venue.id, "under_review", "rejected")}><XCircle />Reject</Button><Button disabled={actionsDisabled} onClick={() => setStatus(venue.id, "under_review", "approved")}><CheckCircle2 />Approve</Button></> : null}{venue.status === "approved" ? <Button disabled title="Publication transition is not available until the backend contract ships"><Send />Publication pending</Button> : null}</div></CardContent></Card>
      })}</div>}
    </div>
  )
}
