"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckCircle2, Clock3, Copy, Mail, ShieldCheck, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { StatusBadge } from "@/components/app/status-badge"
import { useAuth } from "@/components/auth/auth-provider"
import { useCustomerBookings } from "@/hooks/use-data"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export function BookingConfirmationPage({ bookingRef }: { bookingRef: string }) {
  const { user } = useAuth()
  const bookingsQuery = useCustomerBookings(user?.id ?? null)
  const [copied, setCopied] = useState(false)
  const booking = bookingsQuery.data?.find((item) => item.booking_ref === bookingRef)

  async function copyReference() {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(bookingRef)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (bookingsQuery.isPending) return <LoadingState label="Verifying your booking" className="min-h-[60vh]" />
  if (bookingsQuery.isError) return <main className="mx-auto max-w-2xl px-4 py-16"><Notice tone="error" title="Could not verify this booking">{bookingsQuery.error.message}</Notice></main>
  if (!booking) {
    return <main className="mx-auto max-w-2xl px-4 py-16"><EmptyState title="Booking not found" description="This reference does not belong to your account, or the booking does not exist." action={<Button asChild><Link href="/bookings">View my bookings</Link></Button>} /></main>
  }

  const paid = booking.payment_status === "paid"
  const active = booking.status === "confirmed" || booking.status === "completed"
  const confirmed = paid && active
  const pending = booking.payment_status === "pending" && active
  const Icon = confirmed ? CheckCircle2 : pending ? Clock3 : XCircle
  const heading = confirmed ? "Booking confirmed." : pending ? "Payment is processing." : "This booking is not confirmed."

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
      <div className={`flex size-20 items-center justify-center rounded-[2rem] shadow-xl ${confirmed ? "bg-accent text-accent-foreground shadow-accent/20" : pending ? "bg-amber-500/10 text-amber-700" : "bg-destructive/10 text-destructive"}`}><Icon className="size-10" /></div>
      <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-primary">Booking status</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">{heading}</h1>
      <p className="mt-4 max-w-lg text-muted-foreground">{confirmed ? "Keep this reference handy when you arrive at the venue. This page is safe to refresh and will not create another booking." : pending ? "The payment webhook has not finalized this booking yet. Refresh this page after the payment provider returns." : "Review the current booking and payment states below before making any changes."}</p>
      <Card className="mt-8 w-full text-left"><CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-sm text-muted-foreground">Booking reference</CardTitle><div className="flex gap-2"><StatusBadge status={booking.status} /><StatusBadge status={booking.payment_status} /></div></div></CardHeader><CardContent className="pt-5"><div className="flex items-center justify-between gap-3 rounded-xl bg-foreground px-4 py-4 text-background"><span className="font-mono text-xl font-bold tracking-wider">{bookingRef}</span><Button variant="secondary" size="sm" onClick={copyReference}>{copied ? "Copied" : <Copy />}</Button></div><div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3"><span className="inline-flex items-center gap-2"><Mail className="size-4" />Account-owned record</span><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4" />{formatCurrency(booking.total_charged)} charged</span><span className="inline-flex items-center gap-2"><Clock3 className="size-4" />{formatDateTime(booking.created_at)}</span></div></CardContent></Card>
      <Notice tone={confirmed ? "info" : pending ? "warning" : "error"} title="Need to make a change?" className="mt-6 w-full text-left">Cancellation and payment status are managed from your bookings page.</Notice>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row"><Button asChild><Link href="/bookings">View my bookings</Link></Button><Button variant="outline" asChild><Link href="/">Discover more courts</Link></Button></div>
    </main>
  )
}
