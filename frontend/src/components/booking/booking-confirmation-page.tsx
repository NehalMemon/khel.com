"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Clock3, Copy, Mail, ShieldCheck, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { StatusBadge } from "@/components/app/status-badge"
import { useAuth } from "@/components/auth/auth-provider"
import { useCustomerBookingByRef } from "@/hooks/use-customer-data"
import { formatCurrency, formatDateTime } from "@/lib/utils"

/** How often to re-read the booking while the payment is still settling. */
const POLL_INTERVAL_MS = 2_000
/** After this long we stop polling and hand the buyer a calm, honest message. */
const CONFIRMATION_TIMEOUT_SECONDS = 60

export function BookingConfirmationPage({ bookingRef }: { bookingRef: string }) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const bookingQuery = useCustomerBookingByRef(user?.id ?? null, bookingRef)
  const booking = bookingQuery.data
  const refetchBooking = bookingQuery.refetch

  // Only the database knows whether the payment settled — a success query
  // parameter or the redirect that led here is not proof of payment.
  const pending = booking?.payment_status === "pending"
  const timedOut = elapsedSeconds >= CONFIRMATION_TIMEOUT_SECONDS

  // Keep the latest `refetch` in a ref so the polling interval below never has
  // to be torn down and recreated on every render.
  const refetchRef = useRef(refetchBooking)
  useEffect(() => {
    refetchRef.current = refetchBooking
  }, [refetchBooking])

  useEffect(() => {
    if (!pending) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [pending])

  // Re-read the booking every couple of seconds while the payment is settling,
  // and stop once it settles or we hit the confirmation timeout.
  useEffect(() => {
    if (!pending || timedOut) return
    const timer = window.setInterval(() => {
      void refetchRef.current()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [pending, timedOut])

  async function copyReference() {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(bookingRef)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (bookingQuery.isPending) {
    return <LoadingState label="Verifying your booking" className="min-h-[60vh]" />
  }

  if (bookingQuery.isError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Notice tone="error" title="Could not verify this booking">
          {bookingQuery.error.message}
        </Notice>
      </main>
    )
  }

  if (!booking) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Booking not found"
          description="This reference does not belong to your account, or the booking does not exist."
          action={
            <Button asChild>
              <Link href="/bookings">View my bookings</Link>
            </Button>
          }
        />
      </main>
    )
  }

  const paid = booking.payment_status === "paid"
  const active = booking.status === "confirmed" || booking.status === "completed"
  const confirmed = paid && active
  const awaitingPayment = pending && active && !timedOut
  const stillConfirming = pending && timedOut

  const Icon = confirmed ? CheckCircle2 : stillConfirming ? Clock3 : awaitingPayment ? Clock3 : XCircle
  const iconClass = confirmed
    ? "bg-accent text-accent-foreground shadow-accent/20"
    : awaitingPayment || stillConfirming
      ? "bg-warning/10 text-warning-foreground"
      : "bg-destructive/10 text-destructive"
  const heading = confirmed
    ? "Booking confirmed."
    : awaitingPayment
      ? "Payment is processing."
      : stillConfirming
        ? "Still confirming your payment."
        : "This booking is not confirmed."
  const description = confirmed
    ? "Keep this reference handy when you arrive at the venue. This page is safe to refresh and will not create another booking."
    : awaitingPayment
      ? "We are waiting for the payment provider to confirm this booking. This page refreshes automatically — no need to reload."
      : stillConfirming
        ? "This is taking longer than usual. Your payment may still be settling; check My bookings in a little while before trying again."
        : "Review the current booking and payment states below before making any changes."

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
      <div className={`flex size-20 items-center justify-center rounded-[2rem] shadow-xl ${iconClass}`}>
        <Icon className="size-10" />
      </div>
      <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-primary">Booking status</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">{heading}</h1>
      <p className="mt-4 max-w-lg text-muted-foreground">{description}</p>

      <Card className="mt-8 w-full text-left">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm text-muted-foreground">Booking reference</CardTitle>
            <div className="flex gap-2">
              <StatusBadge status={booking.status} />
              <StatusBadge status={booking.payment_status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-foreground px-4 py-4 text-background">
            <span className="font-mono text-xl font-bold tracking-wider">{bookingRef}</span>
            <Button variant="secondary" size="sm" onClick={copyReference}>
              {copied ? "Copied" : <Copy />}
            </Button>
          </div>
          <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <span className="inline-flex items-center gap-2">
              <Mail className="size-4" />
              Account-owned record
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4" />
              {formatCurrency(booking.total_charged)} charged
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" />
              {formatDateTime(booking.created_at)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Notice
        tone={confirmed ? "info" : awaitingPayment || stillConfirming ? "warning" : "error"}
        title="Need to make a change?"
        className="mt-6 w-full text-left"
      >
        Cancellation and payment status are managed from your bookings page.
      </Notice>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/bookings">View my bookings</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Discover more courts</Link>
        </Button>
      </div>
    </main>
  )
}
