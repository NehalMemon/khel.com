"use client"

import Link from "next/link"
import { ArrowRight, Building2, CircleDollarSign, ClipboardList, Gauge, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/app/metric-card"
import { Notice } from "@/components/app/notice"
import { LoadingState } from "@/components/app/loading-state"
import { StatusBadge } from "@/components/app/status-badge"
import { useAuth } from "@/components/auth/auth-provider"
import { useAllBookings, useReviewVenues } from "@/hooks/use-admin-data"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export function AdminDashboard() {
  const { profile } = useAuth()
  const venuesQuery = useReviewVenues()
  const bookingsQuery = useAllBookings()
  const venues = venuesQuery.data ?? []
  const bookings = bookingsQuery.data ?? []
  const paidBookings = bookings.filter((booking) => booking.payment_status === "paid")
  const grossVolume = paidBookings.reduce((total, booking) => total + Number(booking.total_charged), 0)
  const payoutVolume = paidBookings.reduce((total, booking) => total + Number(booking.venue_payout_amount), 0)

  if (venuesQuery.isPending || bookingsQuery.isPending) return <LoadingState label="Loading operations overview" />
  if (venuesQuery.isError) return <Notice tone="error" title="Could not load the review queue">{venuesQuery.error.message}</Notice>
  if (bookingsQuery.isError) return <Notice tone="error" title="Could not load bookings">{bookingsQuery.error.message}</Notice>

  return (
    <div className="grid gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Operations center</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Welcome, {profile?.name.split(" ")[0]}.</h1><p className="mt-2 text-muted-foreground">Monitor marketplace activity and keep venue operations moving.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/admin/venues">All venues</Link></Button><Button asChild><Link href="/admin/venues/review">Open review queue <ArrowRight /></Link></Button></div></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Review queue" value={String(venues.length)} detail="Submitted, review, approved" icon={<Building2 className="size-4" />} /><MetricCard label="Bookings" value={String(bookings.length)} detail="Platform-wide records" icon={<ClipboardList className="size-4" />} /><MetricCard label="Paid volume" value={formatCurrency(grossVolume)} detail="Gross paid bookings" icon={<Gauge className="size-4" />} /><MetricCard label="Venue payouts" value={formatCurrency(payoutVolume)} detail="Backend ledger snapshot" icon={<CircleDollarSign className="size-4" />} /></div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card><CardHeader className="border-b"><div className="flex items-center justify-between gap-4"><div><CardTitle>Venue review queue</CardTitle><p className="mt-1 text-sm text-muted-foreground">Oldest actionable listings appear first.</p></div><Button variant="ghost" size="sm" asChild><Link href="/admin/venues/review">View all</Link></Button></div></CardHeader><CardContent className="grid gap-2 pt-4">{venues.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">The review queue is clear.</p> : venues.slice(0, 6).map((venue) => <div key={venue.id} className="flex items-center justify-between gap-4 rounded-xl border p-3"><div className="min-w-0"><p className="truncate font-semibold">{venue.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{venue.address}</p></div><div className="flex shrink-0 items-center gap-2"><StatusBadge status={venue.status} /><span className="hidden text-xs text-muted-foreground sm:inline">{formatDateTime(venue.updated_at)}</span></div></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Backend dependencies</CardTitle></CardHeader><CardContent className="grid gap-3"><div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" /><div><p className="text-sm font-semibold">Payment gateway</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Slot holding and `app_config` are live, but no gateway initiation Edge Function or booking-creation RPC exists, so bookings cannot be completed or paid from the frontend yet.</p></div></div><div className="flex gap-3 rounded-xl border p-3"><Building2 className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-semibold">Live platform config</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Commission, search radius, and hold expiry are editable on the configuration page and read at runtime by all three apps.</p></div></div></CardContent></Card>
      </div>
    </div>
  )
}
