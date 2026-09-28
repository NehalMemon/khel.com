"use client"

import Link from "next/link"
import { CalendarDays, CreditCard, ReceiptText, XCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/app/status-badge"
import { Notice } from "@/components/app/notice"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { useAuth } from "@/components/auth/auth-provider"
import { useCancelCustomerBookingMutation, useCustomerBookings } from "@/hooks/use-data"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export function BookingsPage() {
  const { user } = useAuth()
  const bookingsQuery = useCustomerBookings(user?.id ?? null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const cancelMutation = useCancelCustomerBookingMutation()

  async function cancelBooking(bookingId: string) {
    setCancelError(null)
    try {
      await cancelMutation.mutateAsync(bookingId)
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Could not cancel this booking.")
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Your game plan</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">My bookings</h1><p className="mt-2 text-muted-foreground">Keep every court reservation and payment status in one place.</p></div><Button variant="outline" asChild><Link href="/">Find another court</Link></Button></div>
      {cancelError ? <Notice tone="error" title="Could not cancel booking" className="mt-6">{cancelError}</Notice> : null}
      {bookingsQuery.isPending ? <LoadingState label="Loading your bookings" /> : null}
      {bookingsQuery.isError ? <Notice tone="error" title="Could not load bookings" className="mt-6">{bookingsQuery.error.message}</Notice> : null}
      {!bookingsQuery.isPending && !bookingsQuery.isError && bookingsQuery.data.length === 0 ? <EmptyState className="mt-8" title="No bookings yet" description="Your confirmed court reservations will show up here." action={<Button asChild><Link href="/">Explore venues</Link></Button>} /> : null}
      <div className="mt-8 grid gap-4">{bookingsQuery.data?.map((booking) => <Card key={booking.id}><CardHeader className="border-b"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><CardTitle className="flex items-center gap-2"><ReceiptText className="size-4 text-primary" />{booking.booking_ref}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Booked {formatDateTime(booking.created_at)}</p></div><div className="flex gap-2"><StatusBadge status={booking.status} /><StatusBadge status={booking.payment_status} /></div></div></CardHeader><CardContent className="grid gap-4 pt-5 sm:grid-cols-3"><div className="flex items-center gap-2 text-sm"><CalendarDays className="size-4 text-muted-foreground" /><span>Court booking</span></div><div className="flex items-center gap-2 text-sm"><CreditCard className="size-4 text-muted-foreground" /><span>{formatCurrency(booking.total_charged)}</span></div><div className="flex items-center justify-end gap-2 sm:justify-start"><Button variant="outline" size="sm" asChild><Link href={`/bookings/confirmation/${booking.booking_ref}`}>View details</Link></Button>{booking.status === "confirmed" ? <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={cancelMutation.isPending} onClick={() => cancelBooking(booking.id)}><XCircle />Cancel</Button> : null}</div></CardContent></Card>)}</div>
    </main>
  )
}
