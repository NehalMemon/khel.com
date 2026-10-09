"use client"

import { useState } from "react"
import { CircleDollarSign, Search, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Notice } from "@/components/app/notice"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { MetricCard } from "@/components/app/metric-card"
import { StatusBadge } from "@/components/app/status-badge"
import { useAuth } from "@/components/auth/auth-provider"
import { useMarkPartnerBookingNoShowMutation, usePartnerBookings, usePartnerVenues } from "@/hooks/use-partner-data"
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/utils"

export function PartnerBookingsPage() {
  const { profile } = useAuth()
  const venuesQuery = usePartnerVenues(profile?.id ?? null)
  const bookingsQuery = usePartnerBookings(profile?.id ?? null)
  const noShowMutation = useMarkPartnerBookingNoShowMutation()
  const [search, setSearch] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const venues = venuesQuery.data ?? []
  const venueNames = new Map(venues.map((venue) => [venue.id, venue.name]))
  const bookings = bookingsQuery.data ?? []
  const searchValue = search.trim().toLowerCase()
  const filteredBookings = searchValue
    ? bookings.filter((booking) => {
        const venueName = venueNames.get(booking.venue_id)?.toLowerCase() ?? ""
        return booking.booking_ref.toLowerCase().includes(searchValue) || venueName.includes(searchValue)
      })
    : bookings
  const paidPayout = bookings.filter((booking) => booking.payment_status === "paid").reduce((total, booking) => total + Number(booking.venue_payout_amount), 0)
  const pendingActions = bookings.filter((booking) => booking.status === "confirmed").length

  async function markNoShow(bookingId: string) {
    setActionError(null)
    try {
      await noShowMutation.mutateAsync(bookingId)
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  if (venuesQuery.isPending || bookingsQuery.isPending) return <LoadingState label="Loading partner bookings" />
  if (venuesQuery.isError) return <Notice tone="error" title="Could not load venues">{venuesQuery.error.message}</Notice>
  if (bookingsQuery.isError) return <Notice tone="error" title="Could not load bookings">{bookingsQuery.error.message}</Notice>

  return (
    <main className="grid gap-6">
      <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Partner portal</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Bookings</h1><p className="mt-2 text-muted-foreground">Review reservations across your venues, payment outcomes, and payout figures.</p></div>
      <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Total bookings" value={String(bookings.length)} detail="Across owned venues" icon={<Search className="size-4" />} /><MetricCard label="Needs attention" value={String(pendingActions)} detail="Confirmed reservations" icon={<UserX className="size-4" />} /><MetricCard label="Paid payout" value={formatCurrency(paidPayout)} detail="Backend ledger snapshot" icon={<CircleDollarSign className="size-4" />} /></div>
      {actionError ? <Notice tone="error" title="Could not update booking">{actionError}</Notice> : null}
      <Card>
        <CardHeader className="border-b"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><CardTitle>Reservation ledger</CardTitle><p className="mt-1 text-sm text-muted-foreground">Booking and payment states are tracked independently.</p></div><div className="relative sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference or venue" className="pl-10" /></div></div></CardHeader>
        <CardContent className="pt-5">
          {filteredBookings.length === 0 ? <EmptyState title="No bookings found" description={bookings.length === 0 ? "Reservations for your published venues will appear here." : "Try a different reference or venue name."} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Venue</TableHead><TableHead>Created</TableHead><TableHead>Booking status</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Your payout</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>{filteredBookings.map((booking) => <TableRow key={booking.id}><TableCell className="font-mono font-semibold">{booking.booking_ref}</TableCell><TableCell>{venueNames.get(booking.venue_id) ?? "Venue"}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(booking.created_at)}</TableCell><TableCell><StatusBadge status={booking.status} /></TableCell><TableCell><StatusBadge status={booking.payment_status} /></TableCell><TableCell className="text-right font-semibold">{formatCurrency(booking.venue_payout_amount)}</TableCell><TableCell className="text-right">{booking.status === "confirmed" ? <Button variant="outline" size="sm" disabled={noShowMutation.isPending} onClick={() => markNoShow(booking.id)}><UserX />No-show</Button> : "—"}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
