"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LayoutGrid,
  LockKeyhole,
  MapPin,
  Sparkles,
  Star,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Notice } from "@/components/app/notice"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { FreemiumLimitSheet } from "@/components/booking/freemium-limit-sheet"
import { HoldCountdown } from "@/components/booking/hold-countdown"
import { SafepayCheckoutButton } from "@/components/booking/safepay-checkout-button"
import { useAuth } from "@/components/auth/auth-provider"
import { useBookingSelection } from "@/components/booking/booking-selection-provider"
import { useAvailableTimeChips, useHoldSlotMutation, useVenue } from "@/hooks/use-customer-data"
import { isSupabaseConfigured } from "@/lib/supabase-browser"
import type { HoldSlotResult, ResourceRow } from "@/lib/database.types"
import type { PublicSlotRow } from "@/lib/queries/customer"
import {
  FREEMIUM_LIMIT_REACHED,
  formatCurrency,
  formatDate,
  formatTime,
  getDateInputValue,
  isPendingPhone,
  isSlotInFuture,
} from "@/lib/utils"

/** Fallback when a venue has no `max_advance_booking_days` value yet. */
const DEFAULT_ADVANCE_DAYS = 14

function shiftDate(value: string, days: number): string {
  const parsed = new Date(`${value}T00:00:00`)
  parsed.setDate(parsed.getDate() + days)
  return getDateInputValue(parsed)
}

function getAmenities(amenities: unknown): string[] {
  if (!amenities || typeof amenities !== "object" || Array.isArray(amenities)) return []
  return Object.entries(amenities as Record<string, unknown>)
    .filter(([, value]) => value === true || value === "true" || value === 1)
    .map(([key]) => key.replaceAll("_", " "))
}

/** Slot duration in hours, from the naive `HH:MM` values `slots` stores. */
function slotHours(slot: PublicSlotRow): number {
  const [sh, sm] = (slot.start_time ?? "").split(":").map(Number)
  const [eh, em] = (slot.end_time ?? "").split(":").map(Number)
  const diff = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))
  return diff > 0 ? diff / 60 : 1
}

/**
 * A category time chip the customer clicked. The specific asset ("PC 3") is
 * auto-assigned by the storefront, never chosen by the customer — that is the
 * movie-theater rule: they pick a showtime, not a seat number.
 */
type ChipChoice = {
  category: string
  slot: PublicSlotRow
  resource: ResourceRow
  /** Other resources in the category also free at this start time. */
  freeCount: number
  totalCount: number
}

/** One category row: its members plus the aggregated showtimes. */
type CategoryGroup = {
  category: string
  resources: ResourceRow[]
  lowestRate: number | null
}

export function VenueDetailPage({ slug }: { slug: string }) {
  const venueQuery = useVenue(slug)
  const { profile, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setSelection } = useBookingSelection()
  const router = useRouter()
  const queryClient = useQueryClient()

  const today = useMemo(() => getDateInputValue(), [])
  const [date, setDate] = useState(today)
  const [choice, setChoice] = useState<ChipChoice | null>(null)
  const [hold, setHold] = useState<HoldSlotResult | null>(null)
  const [holdExpired, setHoldExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  const venue = venueQuery.data ?? null
  const resources = useMemo(() => venue?.resources ?? [], [venue])

  const maxAdvanceDays = venue?.max_advance_booking_days ?? DEFAULT_ADVANCE_DAYS

  /** Category → its active resources (rooms and the assets inside them). */
  const groups = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, ResourceRow[]>()
    for (const resource of resources) {
      if (resource.is_active === false) continue
      const key = resource.category?.trim() || "Other"
      const bucket = map.get(key)
      if (bucket) bucket.push(resource)
      else map.set(key, [resource])
    }
    return [...map.entries()]
      .map(([category, members]) => {
        const rates = members
          .map((member) => Number(member.hourly_rate))
          .filter((rate) => Number.isFinite(rate) && rate > 0)
        return {
          category,
          resources: members,
          lowestRate: rates.length ? Math.min(...rates) : null,
        }
      })
      .sort((a, b) => a.category.localeCompare(b.category))
  }, [resources])

  // Use dynamic availability RPC per category
  const chipsByCategory = useMemo(() => {
    const result = new Map<string, ChipChoice[]>()
    for (const group of groups) {
      // We'll build chips after queries; this memo will be updated when chip data loads
      result.set(group.category, [])
    }
    return result
  }, [groups])

  const holdMutation = useHoldSlotMutation()

  // Fetch chips per category
  const chipQueries = groups.map((group) => {
    return useAvailableTimeChips(venue?.id ?? null, group.category, date)
  })

  const chipsByCategoryFinal = useMemo(() => {
    const result = new Map<string, ChipChoice[]>()
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      const query = chipQueries[i]
      const chips = query.data ?? []
      if (chips.length === 0) continue
      const list: ChipChoice[] = []
      for (const chip of chips) {
        if (chip.available_inventory <= 0) continue
        // Find a free resource to assign (prefer first active in category)
        const assigned = group.resources[0]
        // Create a synthetic slot for the chip
        const slot: PublicSlotRow = {
          id: `${assigned.id}-${chip.time}`,
          court_id: assigned.id,
          date: date,
          start_time: chip.time,
          end_time: chip.time.length === 5 ? (() => {
            const [h, m] = chip.time.split(':').map(Number)
            const endH = h + 1
            return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
          })() : chip.time,
          status: "available",
        } as PublicSlotRow
        list.push({
          category: group.category,
          slot,
          resource: assigned,
          freeCount: chip.available_inventory,
          totalCount: group.resources.length,
        })
      }
      list.sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time))
      result.set(group.category, list)
    }
    return result
  }, [groups, chipQueries, date])

  function resetHold() {
    setHold(null)
    setHoldExpired(false)
    setError(null)
  }

  function pickChip(next: ChipChoice) {
    resetHold()
    setChoice(next)
  }

  function pickDate(nextDate: string) {
    resetHold()
    setChoice(null)
    setDate(nextDate)
  }

  function expireHold() {
    setHoldExpired(true)
    void queryClient.invalidateQueries({ queryKey: ["slots"] })
  }

  /**
   * The drawer's "hold" step. Guards mirror the booking page: the hold itself
   * is still the `hold_slot` RPC, so the freemium budget and phone rules are
   * enforced there and surfaced here as an error or the upgrade sheet.
   */
  async function handleHold() {
    setError(null)
    if (!choice) return
    if (!isAuthenticated || !profile) {
      // Carry the choice to the booking page through context so the customer
      // returns to the same court/date after signing in.
      setSelection({
        slug,
        courtId: choice.resource.id,
        date,
        slotId: choice.slot.id,
      })
      router.push(`/auth/sign-in?next=${encodeURIComponent(`/venues/${slug}/book`)}`)
      return
    }
    if (isPendingPhone(profile.phone)) {
      setError("Add a real mobile number to your profile before booking.")
      return
    }
    try {
      const result = await holdMutation.mutateAsync({
        courtId: choice.resource.id,
        date,
        startTime: choice.slot.start_time,
      })
      setHold(result)
      setHoldExpired(false)
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "That time is no longer available."
      if (message === FREEMIUM_LIMIT_REACHED) {
        setPaywallOpen(true)
        return
      }
      setError(message)
    }
  }

  if (!isSupabaseConfigured())
    return (
      <Notice tone="warning" title="Supabase connection required">
        Add the public Supabase URL and anon key before loading live venue data.
      </Notice>
    )
  if (venueQuery.isPending) return <LoadingState label="Loading venue" />
  if (venueQuery.isError)
    return <Notice tone="error" title="Could not load this venue">{venueQuery.error.message}</Notice>
  if (!venue)
    return (
      <EmptyState
        title="Venue not found"
        description="This venue may have moved, is not published, or is no longer available."
        action={
          <Button asChild>
            <Link href="/">Back to discover</Link>
          </Button>
        }
      />
    )

  const amenities = getAmenities(venue.amenities)
  const dateOptions = Array.from({ length: Math.max(0, maxAdvanceDays) + 1 }, (_, index) =>
    shiftDate(today, index),
  )
  const price = choice ? Number(choice.resource.hourly_rate) * slotHours(choice.slot) : 0

  const anyChipsLoading = chipQueries.some((q) => q.isPending)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <FreemiumLimitSheet open={paywallOpen} onOpenChange={setPaywallOpen} />
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to discover
      </Link>
      {!profile?.phone || isPendingPhone(profile.phone) ? (
        <Notice tone="warning" title="Add your mobile number" className="mt-6">
          Update your profile with a real number before booking or listing a venue.
        </Notice>
      ) : null}

      <section className="mt-7 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <Badge variant="secondary">Published venue</Badge>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] sm:text-6xl">
            {venue.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            {venue.description ?? "A welcoming indoor space for your next game."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" />
              {venue.address}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {Number(venue.avg_rating).toFixed(1)} rating
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-primary" />
              Book up to {maxAdvanceDays} days ahead
            </span>
          </div>
        </div>
        <div className="rounded-3xl bg-foreground p-6 text-background shadow-xl shadow-primary/10">
          <p className="text-sm text-background/60">Ready when you are</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em]">
            Pick a day.
            <br />
            Pick a time.
          </p>
          <Button asChild className="mt-6 w-full" variant="secondary">
            <a href="#times">
              See available times <ArrowRight />
            </a>
          </Button>
        </div>
      </section>

      <section id="times" className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.45fr]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                Choose your time
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Available now</h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {groups.length} {groups.length === 1 ? "category" : "categories"}
            </span>
          </div>

          {/* Movie-theater date strip: today … today + max_advance_booking_days. */}
          <div className="mt-6 rounded-2xl border border-foreground/8 bg-card p-3">
            <div className="flex items-center gap-2 px-1 pb-2">
              <CalendarDays className="size-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Select a date
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dateOptions.map((option) => {
                const active = option === date
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => pickDate(option)}
                    className={`min-w-20 shrink-0 rounded-xl border px-3 py-2 text-center transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <span className="block text-[11px] font-semibold uppercase opacity-70">
                      {option === today ? "Today" : formatDate(option).split(" ")[0]}
                    </span>
                    <span className="block text-sm font-bold">
                      {formatDate(option).split(" ").slice(1).join(" ")}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {anyChipsLoading ? <LoadingState label="Loading times" className="mt-6" /> : null}
          {chipQueries.some((q) => q.isError) ? (
            <Notice tone="error" title="Could not load times" className="mt-6">
              {(chipQueries.find((q) => q.isError)?.error as Error)?.message}
            </Notice>
          ) : null}

          {!anyChipsLoading && groups.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="Nothing published yet"
              description="This venue has not added its bookable resources yet."
            />
          ) : null}

          {!anyChipsLoading && groups.length > 0 && [...chipsByCategoryFinal.values()].every((c) => c.length === 0) ? (
            <div className="mt-6 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              <p>No available times on {formatDate(date)}.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => pickDate(shiftDate(date, 1))}
                disabled={dateOptions.includes(shiftDate(date, 1)) === false}
              >
                Try the next day
              </Button>
            </div>
          ) : null}

          {/* Category blocks — never a raw "PC 1 / PC 2" asset list. */}
          <div className="mt-6 grid gap-5">
            {groups.map((group) => {
              const chips = chipsByCategoryFinal.get(group.category) ?? []
              if (chips.length === 0) return null
              return (
                <Card key={group.category} className="border-foreground/8 bg-card">
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <LayoutGrid className="size-4 text-primary" />
                          {group.category}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.resources.length}{" "}
                          {group.resources.length === 1 ? "asset" : "assets"} · we assign
                          the exact one at checkout
                        </p>
                      </div>
                      {group.lowestRate !== null ? (
                        <Badge variant="outline">
                          {formatCurrency(group.lowestRate)}/hr
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {chips.map((chip) => {
                        const active =
                          choice?.slot.id === chip.slot.id
                        return (
                          <button
                            key={chip.slot.id}
                            type="button"
                            onClick={() => pickChip(chip)}
                            className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                              active
                                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                : "border-border hover:border-primary/50 hover:bg-primary/5"
                            }`}
                          >
                            {formatTime(chip.slot.start_time)}
                            <span
                              className={`mt-0.5 block text-[11px] font-normal ${
                                active ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {chip.freeCount}/{chip.totalCount} free
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <Card className="bg-secondary/40">
            <CardHeader>
              <CardTitle>Good to know</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 text-sm text-secondary-foreground">
                {amenities.length ? (
                  amenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-2 capitalize">
                      <Check className="size-4 text-primary" />
                      {amenity}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">
                    Amenities are being updated by the venue.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Good sports etiquette</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Arrive on time, respect the space, and keep your booking details handy when
              you arrive.
            </CardContent>
          </Card>
        </aside>
      </section>

      {/* Showtime drawer: confirm duration + price, hold, then Safepay. */}
      <Sheet
        open={choice !== null}
        onOpenChange={(open) => {
          if (!open) {
            resetHold()
            setChoice(null)
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          {choice ? (
            <>
              <SheetHeader>
                <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Sparkles className="size-5" />
                </span>
                <SheetTitle>
                  {formatTime(choice.slot.start_time)} · {choice.category}
                </SheetTitle>
                <SheetDescription>
                  {formatDate(date)} · {slotHours(choice.slot)} hour
                  {slotHours(choice.slot) === 1 ? "" : "s"} booked for you automatically.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-4 px-4">
                {error ? (
                  <Notice tone="error" title="Could not hold this time">
                    {error}
                  </Notice>
                ) : null}

                <div className="grid gap-3 rounded-xl border p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Clock3 className="size-4" /> Time
                    </span>
                    <span className="font-semibold">
                      {formatTime(choice.slot.start_time)}–{formatTime(choice.slot.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Users className="size-4" /> Assigned asset
                    </span>
                    <span className="font-semibold">{choice.resource.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <LockKeyhole className="size-4" /> Total
                    </span>
                    <span className="font-bold">{formatCurrency(price)}</span>
                  </div>
                </div>

                {hold && !holdExpired ? (
                  <div className="grid gap-4">
                    <HoldCountdown
                      key={hold.slot_id}
                      expiresAt={hold.held_until}
                      onExpire={expireHold}
                    />
                    <p className="text-sm text-muted-foreground">
                      {formatTime(choice.slot.start_time)}–{formatTime(choice.slot.end_time)}{" "}
                      is reserved for you. Complete payment to confirm it.
                    </p>
                    <SafepayCheckoutButton
                      slotId={hold.slot_id}
                      holdExpired={holdExpired}
                      amount={price}
                    />
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => void handleHold()}
                    disabled={
                      holdMutation.isPending ||
                      authLoading ||
                      (isAuthenticated && !profile) ||
                      holdExpired
                    }
                  >
                    {holdMutation.isPending ? (
                      <>
                        <LockKeyhole className="animate-pulse" /> Holding your time…
                      </>
                    ) : holdExpired ? (
                      "Hold expired — pick the time again"
                    ) : isAuthenticated ? (
                      <>
                        <LockKeyhole /> Hold & continue to payment
                      </>
                    ) : (
                      <>
                        <LockKeyhole /> Sign in to book
                      </>
                    )}
                  </Button>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  The hold is time-limited and released automatically if payment is not
                  completed.
                </p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  )
}
