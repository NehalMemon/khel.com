"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Plus,
  Send,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Notice } from "@/components/app/notice"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { MetricCard } from "@/components/app/metric-card"
import { StatusBadge } from "@/components/app/status-badge"
import { VenueManager } from "@/components/partner/venue-manager"
import { useAuth } from "@/components/auth/auth-provider"
import {
  usePartnerBookings,
  usePartnerVenues,
  useSubmitVenueMutation,
} from "@/hooks/use-data"
import { userVenuePreviewUrl } from "@/lib/app-links"
import type { VenueRow } from "@/lib/database.types"
import { formatCurrency, getErrorMessage, isPendingPhone } from "@/lib/utils"

export function PartnerDashboard() {
  const { profile } = useAuth()
  const venuesQuery = usePartnerVenues(profile?.id ?? null)
  const bookingsQuery = usePartnerBookings(profile?.id ?? null)
  const submitMutation = useSubmitVenueMutation()
  const [actionError, setActionError] = useState<string | null>(null)
  const [managedVenueId, setManagedVenueId] = useState("")

  const venues = venuesQuery.data ?? []
  const courts = venues.flatMap((venue) => venue.courts)
  const bookings = bookingsQuery.data ?? []
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed")
  const paidBookings = bookings.filter((booking) => booking.payment_status === "paid")
  const payout = paidBookings.reduce(
    (total, booking) => total + Number(booking.venue_payout_amount),
    0,
  )
  const phonePending = isPendingPhone(profile?.phone)
  const managedVenue: VenueRow | undefined =
    managedVenueId === "new"
      ? undefined
      : (venues.find((venue) => venue.id === managedVenueId) ?? venues[0])

  async function submitForReview(venueId: string) {
    setActionError(null)
    try {
      await submitMutation.mutateAsync(venueId)
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  return (
    <main className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Partner portal
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">
            Good to see you, {profile?.name.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-muted-foreground">Here is the pulse of your venues today.</p>
        </div>
        <Button asChild>
          <Link href="/courts">
            <Plus />
            Add a court
          </Link>
        </Button>
      </div>

      {phonePending ? (
        <Notice
          tone="warning"
          title="Add your phone before submitting a venue"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/profile">Update profile</Link>
            </Button>
          }
        >
          The platform needs a valid mobile number for booking and listing operations.
        </Notice>
      ) : null}
      {actionError ? (
        <Notice tone="error" title="Could not update venue">
          {actionError}
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Venues"
          value={String(venues.length)}
          detail="Connected to your account"
          icon={<Building2 className="size-4" />}
        />
        <MetricCard
          label="Courts"
          value={String(courts.length)}
          detail="Ready for scheduling"
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Confirmed bookings"
          value={String(confirmedBookings.length)}
          detail="Current booking queue"
          icon={<CalendarDays className="size-4" />}
        />
        <MetricCard
          label="Venue payout"
          value={formatCurrency(payout)}
          detail="From paid bookings"
          icon={<CircleDollarSign className="size-4" />}
        />
      </div>

      {venuesQuery.isPending ? <LoadingState label="Loading your venues" /> : null}
      {venuesQuery.isError ? (
        <Notice tone="error" title="Could not load your venues">
          {venuesQuery.error.message}
        </Notice>
      ) : null}
      {bookingsQuery.isPending ? <LoadingState label="Loading booking totals" /> : null}
      {bookingsQuery.isError ? (
        <Notice tone="error" title="Could not load booking totals">
          {bookingsQuery.error.message}
        </Notice>
      ) : null}

      {!venuesQuery.isPending && venues.length === 0 ? (
        <EmptyState
          title="Bring your first venue to life"
          description="Create a venue draft, add your courts, then submit it for review when it is ready."
          action={
            <Button asChild>
              <Link href="/courts">
                Start with your courts <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : null}

      {venues.length > 0 ? (
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Your venues</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review status and keep your listing details fresh.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/courts">
                  Manage courts <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {venues.map((venue) => {
              const previewUrl =
                venue.status === "published" ? userVenuePreviewUrl(venue.slug) : null
              return (
                <div
                  key={venue.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{venue.name}</h3>
                      <StatusBadge status={venue.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {venue.address} · {venue.courts.length} courts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {previewUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={previewUrl} target="_blank" rel="noreferrer">
                          Preview
                        </a>
                      </Button>
                    ) : null}
                    {venue.status === "draft" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                          submitMutation.isPending ||
                          venue.courts.length === 0 ||
                          phonePending
                        }
                        onClick={() => submitForReview(venue.id)}
                      >
                        <Send />
                        Submit for review
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {profile && venues.length > 0 ? (
        <div className="grid max-w-md gap-2">
          <Label htmlFor="managed-venue">Venue to edit</Label>
          <Select value={managedVenue?.id ?? "new"} onValueChange={setManagedVenueId}>
            <SelectTrigger id="managed-venue" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
              <SelectItem value="new">Create another venue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {profile ? (
        <VenueManager
          key={managedVenue?.id ?? "new"}
          ownerId={profile.id}
          venue={managedVenue}
          disabled={phonePending}
        />
      ) : null}

      <Notice tone="info" title="Review workflow">
        New venues move through draft to submitted, then the platform team controls the
        under review, approved, and published transitions.
      </Notice>
    </main>
  )
}
