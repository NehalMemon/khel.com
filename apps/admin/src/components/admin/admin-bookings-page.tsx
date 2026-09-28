"use client"

import { useState } from "react"
import { CircleDollarSign, CreditCard, Search, TicketCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MetricCard } from "@/components/app/metric-card"
import { Notice } from "@/components/app/notice"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { StatusBadge } from "@/components/app/status-badge"
import { useAllBookings } from "@/hooks/use-data"
import type { PaymentStatus } from "@/lib/database.types"
import { formatCurrency, formatDateTime } from "@/lib/utils"

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value
}

export function AdminBookingsPage() {
  const bookingsQuery = useAllBookings()
  const [search, setSearch] = useState("")
  const [payment, setPayment] = useState<PaymentStatus | "all">("all")
  const bookings = bookingsQuery.data ?? []
  const searchValue = search.trim().toLowerCase()
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = !searchValue || booking.booking_ref.toLowerCase().includes(searchValue) || booking.customer_id.toLowerCase().includes(searchValue) || booking.venue_id.toLowerCase().includes(searchValue)
    return matchesSearch && (payment === "all" || booking.payment_status === payment)
  })
  const paidBookings = bookings.filter((booking) => booking.payment_status === "paid")
  const collected = paidBookings.reduce((total, booking) => total + Number(booking.total_charged), 0)
  const commission = paidBookings.reduce((total, booking) => total + Number(booking.commission_amount_snapshot), 0)

  if (bookingsQuery.isPending) return <LoadingState label="Loading booking oversight" />
  if (bookingsQuery.isError) return <Notice tone="error" title="Could not load bookings">{bookingsQuery.error.message}</Notice>

  return (
    <div className="grid gap-6">
      <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Platform ledger</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Bookings oversight</h1><p className="mt-2 text-muted-foreground">Review every booking and its independent payment state.</p></div>
      <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Bookings" value={String(bookings.length)} detail="All platform records" icon={<TicketCheck className="size-4" />} /><MetricCard label="Collected" value={formatCurrency(collected)} detail="Paid booking value" icon={<CreditCard className="size-4" />} /><MetricCard label="Commission snapshot" value={formatCurrency(commission)} detail="Ledger value, not a live rate" icon={<CircleDollarSign className="size-4" />} /></div>
      <Card><CardHeader className="border-b"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><CardTitle>All bookings</CardTitle><p className="mt-1 text-sm text-muted-foreground">Booking and payment badges remain intentionally separate.</p></div><div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, customer, or venue ID" className="pl-10" /></div><Select value={payment} onValueChange={(value) => setPayment(value as PaymentStatus | "all")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All payments</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select></div></div></CardHeader><CardContent className="pt-5">{filteredBookings.length === 0 ? <EmptyState title="No bookings found" description="Try a different search or payment filter." /> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Customer</TableHead><TableHead>Venue</TableHead><TableHead>Created</TableHead><TableHead>Booking</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Payout</TableHead><TableHead>Gateway ref</TableHead></TableRow></TableHeader><TableBody>{filteredBookings.map((booking) => <TableRow key={booking.id}><TableCell className="font-mono font-semibold">{booking.booking_ref}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{shortId(booking.customer_id)}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{shortId(booking.venue_id)}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(booking.created_at)}</TableCell><TableCell><StatusBadge status={booking.status} /></TableCell><TableCell><StatusBadge status={booking.payment_status} /></TableCell><TableCell className="text-right font-semibold">{formatCurrency(booking.total_charged)}</TableCell><TableCell className="text-right">{formatCurrency(booking.venue_payout_amount)}</TableCell><TableCell className="max-w-36 truncate font-mono text-xs text-muted-foreground">{booking.payment_gateway_ref ?? "—"}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
    </div>
  )
}
