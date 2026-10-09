"use client"

import { useMemo, useState, type FormEvent } from "react"
import { CalendarClock, Check, LoaderCircle, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Notice } from "@/components/app/notice"
import { LoadingState } from "@/components/app/loading-state"
import { StatusBadge } from "@/components/app/status-badge"
import { PartnerSlotManager } from "@/components/partner/partner-slot-manager"
import { useAuth } from "@/components/auth/auth-provider"
import { useCreateSlotsMutation, usePartnerVenues, useSetPartnerSlotStatusMutation, useSlots } from "@/hooks/use-partner-data"
import type { PartnerSlotValues } from "@/lib/queries/partner"
import type { SlotStatus } from "@/lib/database.types"
import { formatDate, formatTime, getDateInputValue, getErrorMessage } from "@/lib/utils"

function addMinutes(value: string, minutes: number): string {
  const [hours, mins] = value.split(":").map(Number)
  const total = hours * 60 + mins + minutes
  const nextHours = Math.floor(total / 60)
  const nextMinutes = total % 60
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`
}

function isTimeBefore(start: string, end: string): boolean {
  return start < end
}

type EditableSlotStatus = Extract<SlotStatus, "available" | "blocked" | "maintenance">

export function PartnerSchedulePage() {
  const { profile } = useAuth()
  const venuesQuery = usePartnerVenues(profile?.id ?? null)
  const [venueId, setVenueId] = useState("")
  const [courtId, setCourtId] = useState("")
  const [date, setDate] = useState(() => getDateInputValue(new Date(Date.now() + 86_400_000)))
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("22:00")
  const [interval, setIntervalValue] = useState("60")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const createMutation = useCreateSlotsMutation()
  const setStatusMutation = useSetPartnerSlotStatusMutation()
  const venues = useMemo(() => venuesQuery.data ?? [], [venuesQuery.data])
  const activeVenueId = venues.some((venue) => venue.id === venueId) ? venueId : venues[0]?.id ?? ""
  const courts = useMemo(() => venues.find((venue) => venue.id === activeVenueId)?.courts ?? [], [activeVenueId, venues])
  const activeCourtId = courts.some((court) => court.id === courtId) ? courtId : courts[0]?.id ?? ""
  const slotsQuery = useSlots(activeCourtId || null, date)

  const generatedSlots = useMemo(() => {
    const step = Number(interval)
    if (!isTimeBefore(startTime, endTime) || !Number.isInteger(step) || step < 15 || step > 1440) return []
    const slots: PartnerSlotValues[] = []
    let cursor = startTime
    while (cursor < endTime) {
      const next = addMinutes(cursor, step)
      if (next > endTime || next <= cursor) break
      slots.push({ court_id: activeCourtId, date, start_time: `${cursor}:00`, end_time: `${next}:00` })
      cursor = next
    }
    return slots
  }, [activeCourtId, date, endTime, interval, startTime])

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (!activeCourtId || !date || !startTime || !endTime || generatedSlots.length === 0) {
      setError("Choose a court, date, and a valid time range with at least 15-minute intervals.")
      return
    }
    const existingKeys = new Set((slotsQuery.data ?? []).map((slot) => `${slot.court_id}|${slot.date}|${slot.start_time}`))
    const newSlots = generatedSlots.filter((slot) => !existingKeys.has(`${slot.court_id}|${slot.date}|${slot.start_time}`))
    if (newSlots.length === 0) {
      setError("All of those start times already exist for this court and date.")
      return
    }
    try {
      await createMutation.mutateAsync(newSlots)
      setSaved(true)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  async function updatePartnerSlot(slotId: string, status: EditableSlotStatus, expectedStatus: EditableSlotStatus) {
    setError(null)
    try {
      await setStatusMutation.mutateAsync({ slotId, status, expectedStatus })
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  async function toggleSlot(slotId: string, currentStatus: string) {
    if (currentStatus === "available") {
      await updatePartnerSlot(slotId, "blocked", "available")
    } else if (currentStatus === "blocked") {
      await updatePartnerSlot(slotId, "maintenance", "blocked")
    } else if (currentStatus === "maintenance") {
      await updatePartnerSlot(slotId, "available", "maintenance")
    }
  }

  if (venuesQuery.isPending) return <LoadingState label="Loading your schedule" />
  if (venuesQuery.isError) return <Notice tone="error" title="Could not load schedule">{venuesQuery.error.message}</Notice>
  if (venues.length === 0) return <Notice tone="info" title="Add a venue and court first">Schedules are generated per court, so your venue and court setup needs to be complete.</Notice>

  return (
    <main className="grid gap-6"><PartnerSlotManager slots={slotsQuery.data ?? []} date={date} hasContext={Boolean(activeCourtId && date)} isLoading={slotsQuery.isPending} error={slotsQuery.error?.message} pending={setStatusMutation.isPending} onCycle={toggleSlot} /><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Partner portal</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Schedule</h1><p className="mt-2 text-muted-foreground">Generate bookable inventory and keep unavailable times under control.</p></div><Notice tone="warning" title="Inventory dependency">Stale-hold cleanup is still a backend open item. Held slots are shown as-is until the scheduled cleanup process is shipped.</Notice><Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><CalendarClock className="size-5 text-primary" /> Generate slots</CardTitle></CardHeader><CardContent className="pt-6"><form className="grid gap-5" onSubmit={handleGenerate}>{error ? <Notice tone="error" title="Could not update schedule">{error}</Notice> : null}{saved ? <Notice tone="success" title="Slots generated"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5" />Your inventory has been refreshed.</span></Notice> : null}<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><div className="grid gap-2"><Label>Venue</Label><Select value={activeVenueId} onValueChange={(value) => { setVenueId(value); setCourtId("") }}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{venues.map((venue) => <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Court</Label><Select value={activeCourtId} onValueChange={setCourtId}><SelectTrigger className="h-11 w-full"><SelectValue placeholder="Choose court" /></SelectTrigger><SelectContent>{courts.map((court) => <SelectItem key={court.id} value={court.id}>{court.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="schedule-date">Date</Label><Input id="schedule-date" type="date" min={getDateInputValue()} value={date} onChange={(event) => setDate(event.target.value)} className="h-11" /></div><div className="grid gap-2"><Label htmlFor="schedule-interval">Minutes per slot</Label><Input id="schedule-interval" type="number" min="15" max="1440" step="15" value={interval} onChange={(event) => setIntervalValue(event.target.value)} className="h-11" /></div></div><div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="schedule-start">Start time</Label><Input id="schedule-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="h-11" /></div><div className="grid gap-2"><Label htmlFor="schedule-end">End time</Label><Input id="schedule-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="h-11" /></div></div><div className="flex items-center justify-between gap-3 border-t pt-5"><p className="text-sm text-muted-foreground">{generatedSlots.length} slots will be created for this range.</p><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? <><LoaderCircle className="animate-spin" />Generating…</> : <><Plus />Generate slots</>}</Button></div></form></CardContent></Card><Card><CardHeader className="border-b"><div className="flex items-center justify-between gap-4"><div><CardTitle>{date ? formatDate(date) : "Schedule"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Toggle available slots to block or reopen them.</p></div><Button variant="outline" size="sm" onClick={() => slotsQuery.refetch()} disabled={slotsQuery.isFetching}><RefreshCw className={slotsQuery.isFetching ? "animate-spin" : ""} />Refresh</Button></div></CardHeader><CardContent className="pt-5">{slotsQuery.isPending ? <LoadingState label="Loading slots" /> : null}{slotsQuery.isError ? <Notice tone="error" title="Could not load slots">{slotsQuery.error.message}</Notice> : null}{slotsQuery.data && slotsQuery.data.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No slots generated for this court and date yet.</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{slotsQuery.data?.map((slot) => <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-semibold">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</p><div className="mt-1"><StatusBadge status={slot.status} /></div></div>{slot.status === "available" || slot.status === "blocked" ? <Button variant="ghost" size="sm" onClick={() => toggleSlot(slot.id, slot.status)} disabled={setStatusMutation.isPending}>{slot.status === "available" ? "Block" : "Open"}</Button> : null}</div>)}</div>}</CardContent></Card></main>
  )
}
