"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coffee,
  DoorOpen,
  LoaderCircle,
  MonitorPlay,
  Plus,
  UserRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import {
  useCreateWalkInBookingMutation,
  useVenueBookings,
} from "@/hooks/use-partner-data"
import { useAuth } from "@/components/auth/auth-provider"
import type { ResourceRow } from "@/lib/database.types"
import type { PartnerBookingRow, VenueWithResources } from "@/lib/queries/partner"
import { cn, formatCurrency, formatTime, getDateInputValue, getErrorMessage } from "@/lib/utils"

/** Grid geometry: one column per hour, from open to close. */
const DAY_START_HOUR = 6
const DAY_END_HOUR = 24
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index,
)

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return getDateInputValue(date)
}

/** `HH:MM:SS` / `HH:MM` / ISO timestamp -> minutes past midnight. */
function clockToMinutes(value: string | null): number | null {
  if (!value) return null
  const clock = value.includes("T") ? value.slice(11) : value
  const [hours, minutes] = clock.split(":")
  const h = Number(hours)
  const m = Number(minutes)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Hour option list for the walk-in form, e.g. `06:00` … `23:00`. */
const HOUR_OPTIONS = HOURS.map((hour) => minutesToClock(hour * 60))

type BookingBlock = {
  booking: PartnerBookingRow
  startMinutes: number
  endMinutes: number
}

type WalkInDraft = {
  resourceId: string
  startMinutes: number
  endMinutes: number
  customerName: string
}

/**
 * Owner-facing timeline POS.
 *
 * Rows are the venue's resources (rooms collapse into their nested assets so a
 * walk-in can be placed on the exact unit), columns are hours of the selected
 * day. Any free cell can be tapped to open the walk-in modal, which writes the
 * booking row directly — no Safepay session, because the guest is paying at the
 * desk. Existing bookings render as blocks positioned by their start/end times.
 *
 * Legacy slot-based bookings carry no `start_time` and are filtered out by the
 * query, so the grid never guesses at a position it cannot verify.
 */
export function VenueTimeline({ venues }: { venues: VenueWithResources[] }) {
  const { profile } = useAuth()
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "")
  const [date, setDate] = useState(() => getDateInputValue())
  const [draft, setDraft] = useState<WalkInDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const bookingsQuery = useVenueBookings(venueId || null, date)
  const createMutation = useCreateWalkInBookingMutation(profile?.id ?? "")

  const venue = venues.find((candidate) => candidate.id === venueId) ?? venues[0]
  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data])

  /**
   * Y-axis rows: every bookable leaf. A room with children is a container and
   * is not itself bookable; a room with no children still shows as its own row
   * so the owner can block it directly.
   */
  const rows = useMemo(() => {
    const resources: ResourceRow[] = venue?.resources ?? []
    const childrenByParent = new Map<string, ResourceRow[]>()
    for (const resource of resources) {
      if (!resource.parent_id) continue
      const bucket = childrenByParent.get(resource.parent_id) ?? []
      bucket.push(resource)
      childrenByParent.set(resource.parent_id, bucket)
    }
    const leaves: { resource: ResourceRow; parent: ResourceRow | null }[] = []
    for (const resource of resources) {
      const children = childrenByParent.get(resource.id) ?? []
      const isContainer = !resource.parent_id && children.length > 0
      if (isContainer) {
        for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
          leaves.push({ resource: child, parent: resource })
        }
        continue
      }
      leaves.push({
        resource,
        parent: resource.parent_id
          ? resources.find((candidate) => candidate.id === resource.parent_id) ?? null
          : null,
      })
    }
    return leaves
  }, [venue])

  const blocksByResource = useMemo(() => {
    const map = new Map<string, BookingBlock[]>()
    for (const booking of bookings) {
      const startMinutes = clockToMinutes(booking.start_time)
      if (startMinutes === null) continue
      const endMinutes = clockToMinutes(booking.end_time) ?? startMinutes + 60
      const bucket = map.get(booking.resource_id) ?? []
      bucket.push({ booking, startMinutes, endMinutes })
      map.set(booking.resource_id, bucket)
    }
    return map
  }, [bookings])

  // Keep "now" live so the red line tracks the clock while the page is open.
  const [nowMinutes, setNowMinutes] = useState(() => new Date().getHours() * 60 + new Date().getMinutes())
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date()
      setNowMinutes(now.getHours() * 60 + now.getMinutes())
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const today = getDateInputValue()
  const showNowLine = date === today && nowMinutes >= DAY_START_HOUR * 60 && nowMinutes <= DAY_END_HOUR * 60
  const nowOffset = ((nowMinutes - DAY_START_HOUR * 60) / 60) * 100

  function openWalkIn(resourceId: string, hour: number, startMinutesOverride?: number) {
    if (!profile?.id) {
      setError("Your session is still loading. Try again in a moment.")
      return
    }
    setError(null)
    setNotice(null)
    const startMinutes = startMinutesOverride ?? hour * 60
    setDraft({
      resourceId,
      startMinutes,
      endMinutes: Math.min(startMinutes + 60, DAY_END_HOUR * 60),
      customerName: "",
    })
  }

  async function handleCreateWalkIn() {
    if (!draft || !venue) return
    setError(null)
    if (draft.endMinutes <= draft.startMinutes) {
      setError("The end time must be after the start time.")
      return
    }
    try {
      await createMutation.mutateAsync({
        venueId: venue.id,
        resourceId: draft.resourceId,
        date,
        startTime: minutesToClock(draft.startMinutes),
        endTime: minutesToClock(draft.endMinutes),
        customerName: draft.customerName.trim() || undefined,
      })
      const resourceName =
        rows.find((row) => row.resource.id === draft.resourceId)?.resource.name ?? "Resource"
      setNotice(
        `Walk-in blocked for ${resourceName} at ${formatTime(minutesToClock(draft.startMinutes))}.`,
      )
      setDraft(null)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  if (!venue) return null

  return (
    <div className="grid gap-6">
      {error ? <Notice tone="error" title="Could not complete that action">{error}</Notice> : null}
      {notice ? <Notice tone="success" title="Timeline updated">{notice}</Notice> : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <MonitorPlay className="size-5" />
              </span>
              <div>
                <CardTitle>Front desk timeline</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tap any free slot to block a walk-in instantly.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Coffee className="size-3" />
              {bookings.length} on the grid
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-2 sm:w-64">
              <Label htmlFor="timeline-venue">Venue</Label>
              <Select
                value={venue.id}
                onValueChange={(value) => {
                  setVenueId(value)
                  setDraft(null)
                }}
                disabled={venues.length < 2}
              >
                <SelectTrigger id="timeline-venue" className="h-11 w-full">
                  <SelectValue placeholder="Choose venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeline-date">Day</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous day"
                  onClick={() => setDate((current) => shiftDate(current, -1))}
                >
                  <ChevronLeft />
                </Button>
                <Input
                  id="timeline-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value || today)}
                  className="h-11 w-44"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next day"
                  onClick={() => setDate((current) => shiftDate(current, 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
            {date !== today ? (
              <Button variant="ghost" onClick={() => setDate(today)}>
                <CalendarDays />
                Today
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {bookingsQuery.isPending ? <LoadingState label="Loading timeline" /> : null}
      {bookingsQuery.isError ? (
        <Notice tone="error" title="Could not load the timeline">
          {bookingsQuery.error.message}
        </Notice>
      ) : null}

      {!bookingsQuery.isPending && rows.length === 0 ? (
        <EmptyState
          title="No bookable resources"
          description="Add assets in the Resources designer, then come back to place walk-ins on the timeline."
        />
      ) : null}

      {rows.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">{venue.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatTime(minutesToClock(DAY_START_HOUR * 60))} –{" "}
              {formatTime(minutesToClock(DAY_END_HOUR * 60))}
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[64rem]">
              {/* Header row: hour labels */}
              <div className="grid grid-cols-[10rem_1fr] border-b bg-muted/40">
                <div className="sticky left-0 z-20 border-r bg-muted/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Resource
                </div>
                <div
                  className="relative grid"
                  style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(3.5rem, 1fr))` }}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-r px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {formatTime(minutesToClock(hour * 60))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Body rows */}
              <div>
                {rows.map(({ resource, parent }) => (
                  <div
                    key={resource.id}
                    className="grid grid-cols-[10rem_1fr] border-b last:border-b-0"
                  >
                    <div className="sticky left-0 z-20 flex items-center gap-2 border-r bg-background px-4 py-3">
                      {parent ? (
                        <DoorOpen className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <MonitorPlay className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{resource.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {parent ? `${parent.name} · ` : ""}
                          {resource.category ?? "Uncategorised"} ·{" "}
                          {formatCurrency(resource.hourly_rate)}/hr
                        </p>
                      </div>
                    </div>
                    <div className="relative h-16">
                      <div
                        className="absolute inset-0 grid"
                        style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(3.5rem, 1fr))` }}
                      >
                        {HOURS.map((hour) => (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => openWalkIn(resource.id, hour)}
                            aria-label={`Block a walk-in for ${resource.name} at ${minutesToClock(hour * 60)}`}
                            className="group border-r transition-colors hover:bg-primary/5"
                          >
                            <Plus className="mx-auto size-4 text-primary/0 transition-colors group-hover:text-primary/60" />
                          </button>
                        ))}
                      </div>

                      {/* Existing bookings, positioned across the hour columns */}
                      {(blocksByResource.get(resource.id) ?? []).map(
                        ({ booking, startMinutes, endMinutes }) => {
                          const left =
                            ((startMinutes - DAY_START_HOUR * 60) / 60 / HOURS.length) * 100
                          const width =
                            ((endMinutes - startMinutes) / 60 / HOURS.length) * 100
                          const isWalkIn = booking.booking_ref.startsWith("KHEL-W-")
                          const startLabel = minutesToClock(startMinutes)
                          const endLabel = minutesToClock(endMinutes)
                          return (
                            <button
                              key={booking.id}
                              type="button"
                              onClick={() => openWalkIn(resource.id, 0, startMinutes)}
                              style={{
                                left: `${Math.max(left, 0)}%`,
                                width: `${Math.max(width, 3)}%`,
                              }}
                              className={cn(
                                "absolute top-2 bottom-2 z-10 overflow-hidden rounded-lg px-2 py-1 text-left text-xs shadow-sm transition-opacity hover:opacity-90",
                                isWalkIn
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-primary text-primary-foreground",
                              )}
                            >
                              <span className="block truncate font-semibold">
                                {startLabel}–{endLabel}
                              </span>
                              <span className="block truncate opacity-80">
                                {isWalkIn ? "Walk-in" : booking.payment_status}
                              </span>
                            </button>
                          )
                        },
                      )}

                      {/* Red now-line, scoped to the hour columns of this row */}
                      {showNowLine ? (
                        <div
                          className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-destructive"
                          style={{ left: `${nowOffset}%` }}
                        >
                          <span className="absolute -top-1 -left-1 size-2 rounded-full bg-destructive" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <WalkInSheet
        draft={draft}
        rows={rows}
        isPending={createMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDraft(null)
        }}
        onChange={setDraft}
        onSubmit={handleCreateWalkIn}
      />
    </div>
  )
}

function WalkInSheet({
  draft,
  rows,
  isPending,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  draft: WalkInDraft | null
  rows: { resource: ResourceRow; parent: ResourceRow | null }[]
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onChange: (draft: WalkInDraft) => void
  onSubmit: () => void
}) {
  const resource = draft ? rows.find((row) => row.resource.id === draft.resourceId) : undefined

  return (
    <Sheet open={Boolean(draft)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {draft ? (
          <div className="grid h-full content-start gap-6">
            <SheetHeader>
              <SheetTitle>Block a walk-in</SheetTitle>
              <SheetDescription>
                Reserve this time for a guest paying at the desk. No online payment is
                taken, so the booking is created as <strong>pending</strong>.
              </SheetDescription>
            </SheetHeader>

            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <MonitorPlay className="size-4" />
                {resource?.resource.name ?? "Resource"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {resource?.parent ? `${resource.parent.name} · ` : ""}
                {resource?.resource.category ?? "Uncategorised"}
              </p>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="walkin-start">Start</Label>
                  <Select
                    value={minutesToClock(draft.startMinutes)}
                    onValueChange={(value) => {
                      const startMinutes = clockToMinutes(value) ?? draft.startMinutes
                      onChange({
                        ...draft,
                        startMinutes,
                        endMinutes: Math.max(draft.endMinutes, startMinutes + 60),
                      })
                    }}
                  >
                    <SelectTrigger id="walkin-start" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatTime(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="walkin-end">End</Label>
                  <Select
                    value={minutesToClock(draft.endMinutes)}
                    onValueChange={(value) => {
                      const endMinutes = clockToMinutes(value) ?? draft.endMinutes
                      onChange({ ...draft, endMinutes })
                    }}
                  >
                    <SelectTrigger id="walkin-end" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.filter((option) => {
                        const minutes = clockToMinutes(option) ?? 0
                        return minutes > draft.startMinutes
                      }).map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatTime(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="walkin-name">Guest name (optional)</Label>
                <Input
                  id="walkin-name"
                  value={draft.customerName}
                  onChange={(event) => onChange({ ...draft, customerName: event.target.value })}
                  placeholder="Ali"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Kept on the block label only — it is not stored on the booking record.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <UserRound className="size-4" />
                  Reserving {formatTime(minutesToClock(draft.startMinutes))} –{" "}
                  {formatTime(minutesToClock(draft.endMinutes))}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {formatCurrency(
                    ((draft.endMinutes - draft.startMinutes) / 60) *
                      (resource?.resource.hourly_rate ?? 0),
                  )}{" "}
                  at list price · collected at the venue.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onSubmit} disabled={isPending}>
                {isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
                Block walk-in
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
