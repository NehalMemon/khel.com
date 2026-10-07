"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3, CreditCard, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Notice } from "@/components/app/notice"
import { LoadingState } from "@/components/app/loading-state"
import { HoldCountdown } from "@/components/booking/hold-countdown"
import { FreemiumLimitSheet } from "@/components/booking/freemium-limit-sheet"
import { useAuth } from "@/components/auth/auth-provider"
import { useAvailableSlots, useHoldSlotMutation, useVenue } from "@/hooks/use-data"
import { formatCurrency, formatDate, formatTime, getDateInputValue, isPendingPhone, isSlotInFuture, FREEMIUM_LIMIT_REACHED } from "@/lib/utils"
import type { HoldSlotResult } from "@/lib/database.types"
import type { PublicSlotRow } from "@/lib/queries"

export function BookingFlow({ slug, initialCourtId }: { slug: string; initialCourtId?: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const venueQuery = useVenue(slug)
  const { isAuthenticated, profile, isLoading: authLoading } = useAuth()
  const [date, setDate] = useState(() => getDateInputValue(new Date(Date.now() + 86_400_000)))
  const [courtId, setCourtId] = useState(initialCourtId ?? "")
  const [selectedSlot, setSelectedSlot] = useState<PublicSlotRow | null>(null)
  // `hold_slot` only returns `slot_id` and the backend-issued `held_until`, so the
  // user's chosen slot stays in `selectedSlot` for display.
  const [hold, setHold] = useState<HoldSlotResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const courts = useMemo(() => venueQuery.data?.courts ?? [], [venueQuery.data])
  const activeCourtId = courts.some((court) => court.id === courtId) ? courtId : courts[0]?.id ?? ""
  const slotsQuery = useAvailableSlots(activeCourtId || null, date)
  const hasBookingContext = Boolean(activeCourtId && date)
  const holdMutation = useHoldSlotMutation()
  const selectedCourt = courts.find((court) => court.id === activeCourtId)
  const hasHold = Boolean(hold && selectedSlot)

  const availableSlots = useMemo(() => slotsQuery.data?.filter((slot) => slot.status === "available" && isSlotInFuture(slot.date, slot.start_time)) ?? [], [slotsQuery.data])
  const expireHold = useCallback(() => {
    setHold(null)
    setSelectedSlot(null)
    void queryClient.invalidateQueries({ queryKey: ["slots"] })
  }, [queryClient])

  function clearHold() {
    setHold(null)
    setSelectedSlot(null)
  }

  if (venueQuery.isPending) return <LoadingState label="Loading booking options" />
  if (venueQuery.isError) return <Notice tone="error" title="Could not load booking options">{venueQuery.error.message}</Notice>
  if (!venueQuery.data) return <Notice tone="error" title="Venue not found">This venue is no longer available for booking.</Notice>

  async function handleHold() {
    setError(null)
    if (!isAuthenticated) {
      router.push(`/auth/sign-in?next=${encodeURIComponent(`/venues/${slug}/book?courtId=${activeCourtId}`)}`)
      return
    }
    if (authLoading) {
      setError("Wait for your account profile to finish loading.")
      return
    }
    if (!profile) {
      setError("Your account profile could not be loaded.")
      return
    }
    if (isPendingPhone(profile.phone)) {
      setError("Add a real mobile number to your profile before booking.")
      return
    }
    if (!selectedSlot) {
      setError("Choose an available time first.")
      return
    }
    try {
      const result = await holdMutation.mutateAsync({
        courtId: activeCourtId,
        date,
        startTime: selectedSlot.start_time,
      })
      setHold(result)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "That slot is no longer available."
      // Free accounts may hold one slot per week. The limit is enforced by the
      // RPC, so the UI reacts to the raised exception rather than predicting it.
      if (message === FREEMIUM_LIMIT_REACHED) {
        setPaywallOpen(true)
        return
      }
      setError(message)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <FreemiumLimitSheet open={paywallOpen} onOpenChange={setPaywallOpen} />
      <Link href={`/venues/${slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to venue</Link>
      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-start">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Reserve your game</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em] sm:text-5xl">{venueQuery.data.name}</h1><p className="mt-3 text-muted-foreground">Choose a court, date, and start time. We’ll hold it while you complete payment.</p>
          <Card className="mt-8"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /> 1. Pick your court</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{courts.map((court) => <button key={court.id} type="button" disabled={hasHold || holdMutation.isPending} onClick={() => { setCourtId(court.id); clearHold() }} className={`rounded-xl border p-4 text-left transition-all ${activeCourtId === court.id ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:border-primary/40"}`}><div className="flex items-center justify-between gap-3"><span className="font-semibold">{court.name}</span><ChevronRight className={`size-4 ${activeCourtId === court.id ? "text-primary" : "text-muted-foreground"}`} /></div><p className="mt-1 text-sm text-muted-foreground">{court.sport_type ?? "Indoor sport"} · {formatCurrency(court.hourly_rate)}/hr</p></button>)}</CardContent></Card>
          <Card className="mt-5"><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-5 text-primary" /> 2. Pick a time</CardTitle></CardHeader><CardContent className="grid gap-5"><div className="grid gap-2"><Label htmlFor="booking-date">Date</Label><Input id="booking-date" type="date" min={getDateInputValue()} disabled={hasHold || holdMutation.isPending} value={date} onChange={(event) => { setDate(event.target.value); clearHold() }} className="w-full sm:w-56" /></div>{slotsQuery.isPending && hasBookingContext ? <LoadingState label="Loading times" /> : null}{slotsQuery.isError && hasBookingContext ? <Notice tone="error" title="Could not load times">{slotsQuery.error.message}</Notice> : null}{!hasBookingContext ? <Notice tone="info" title="Choose a court and date">Select an available court and date to see bookable times.</Notice> : null}{!slotsQuery.isPending && !slotsQuery.isError && hasBookingContext && availableSlots.length === 0 ? <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No available times for this date. Try another day.</div> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{availableSlots.map((slot) => <button key={slot.id} type="button" disabled={hasHold || holdMutation.isPending} onClick={() => { setSelectedSlot(slot); setHold(null) }} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${selectedSlot?.id === slot.id ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}>{formatTime(slot.start_time)}<span className={`mt-1 block text-[11px] font-normal ${selectedSlot?.id === slot.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>until {formatTime(slot.end_time)}</span></button>)}</div>}</CardContent></Card>
        </div>
        <aside className="lg:sticky lg:top-24"><Card className="overflow-hidden border-primary/15 shadow-xl shadow-primary/5"><div className="bg-foreground p-5 text-background"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Your reservation</p><p className="mt-2 text-xl font-black">{selectedCourt?.name ?? "Choose a court"}</p><p className="mt-1 text-sm text-background/60">{date ? formatDate(date) : "Choose a date"}</p></div><CardContent className="grid gap-5 p-5">{error ? <Notice tone="error" title="Action needed">{error}</Notice> : null}{hold && selectedSlot ? <div className="grid gap-4"><HoldCountdown key={hold.slot_id} expiresAt={hold.held_until} onExpire={expireHold} /><div className="rounded-xl border border-dashed bg-muted/40 p-4"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4 text-primary" /> Slot held</div><p className="mt-1 text-sm text-muted-foreground">{formatTime(selectedSlot.start_time)}–{formatTime(selectedSlot.end_time)} is reserved for you.</p></div><Notice tone="warning" title="Payment connection pending">The payment gateway is not connected yet. The checkout is intentionally paused until the backend payment Edge Function and webhook contract are shipped.</Notice></div> : <><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Selected time</span><span className="font-semibold">{selectedSlot ? `${formatTime(selectedSlot.start_time)}–${formatTime(selectedSlot.end_time)}` : "Not selected"}</span></div><div className="flex items-center justify-between border-t pt-4 text-sm"><span className="text-muted-foreground">Court rate</span><span className="font-semibold">{selectedCourt ? `${formatCurrency(selectedCourt.hourly_rate)}/hr` : "—"}</span></div><Button size="lg" className="w-full" onClick={handleHold} disabled={holdMutation.isPending || authLoading || (isAuthenticated && !profile) || !selectedSlot}>{authLoading ? "Loading account…" : isAuthenticated && !profile ? "Profile unavailable" : holdMutation.isPending ? "Holding your slot…" : "Hold this slot"}<LockKeyhole /></Button><p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"><CreditCard className="size-3.5" />No charge until payment is connected</p></>}</CardContent></Card></aside>
      </div>
    </main>
  )
}
