"use client"

import { FormEvent, useMemo, useState } from "react"
import { ArrowRight, LocateFixed, MapPinned, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VenueCard } from "@/components/app/venue-card"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { useNearbyVenues, usePublishedVenues } from "@/hooks/use-data"
import { useUserOrigin } from "@/hooks/use-user-origin"
import { useDefaultSearchRadiusKm } from "@/lib/app-config"
import { isSupabaseConfigured } from "@/lib/supabase-browser"
import { APP_TAGLINE } from "@/lib/utils"

type Mode = "nearby" | "all"

function matchesSport(sports: string[], sport: string): boolean {
  if (sport === "all") return true
  return sports.some((value) => value.toLowerCase() === sport.toLowerCase())
}

function matchesSearch(venue: { name: string; address: string }, search: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  return venue.name.toLowerCase().includes(needle) || venue.address.toLowerCase().includes(needle)
}

export function DiscoverPage() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [sport, setSport] = useState("all")
  const [mode, setMode] = useState<Mode>("nearby")

  const { origin, isLocating, error: locationError, requestLocation } = useUserOrigin()
  const radiusKm = useDefaultSearchRadiusKm()

  const nearbyQuery = useNearbyVenues(origin ? { lat: origin.lat, lon: origin.lon } : null, radiusKm, mode === "nearby")
  const filters = useMemo(
    () => ({
      search: search || undefined,
      sport: sport === "all" ? undefined : sport,
    }),
    [search, sport],
  )
  const allQuery = usePublishedVenues(filters)

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearch(searchInput.trim())
  }

  const nearbyVenues = useMemo(() => {
    const rows = nearbyQuery.data ?? []
    return rows
      .filter((venue) =>
        matchesSport(
          venue.courts.map((court) => court.sport_type ?? ""),
          sport,
        ),
      )
      .filter((venue) => matchesSearch(venue, search))
  }, [nearbyQuery.data, search, sport])

  // The facet list is derived from whatever inventory exists. There is no
  // `sports` table, so nothing can be hardcoded here.
  const sportOptions = useMemo(() => {
    const source = mode === "nearby" ? nearbyVenues : (allQuery.data ?? [])
    return Array.from(
      new Set(
        source
          .flatMap((venue) => venue.courts)
          .map((court) => court.sport_type)
          .filter((value): value is string => Boolean(value && value.trim())),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [allQuery.data, mode, nearbyVenues])

  const activeQuery = mode === "nearby" ? nearbyQuery : allQuery
  const showList = mode === "nearby" ? nearbyVenues.length > 0 : (allQuery.data?.length ?? 0) > 0

  return (
    <main>
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="absolute -right-40 -top-48 size-[34rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 size-[28rem] rounded-full bg-primary/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
              <Sparkles className="size-3.5" />
              Karachi&apos;s indoor sports marketplace
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.07em] sm:text-7xl">
              {APP_TAGLINE}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-background/65">
              Find a futsal pitch, badminton court, or practice space near you. Book
              the exact time you want and show up ready to play.
            </p>
            <form
              onSubmit={handleSearch}
              className="mt-9 flex max-w-xl flex-col gap-2 rounded-2xl bg-background p-2 shadow-2xl shadow-black/20 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by venue or area"
                  aria-label="Search by venue or area"
                  className="h-12 border-0 bg-muted pl-10 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6">
                Find courts <ArrowRight />
              </Button>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-background/55">
              <span className="inline-flex items-center gap-1.5">
                <MapPinned className="size-4 text-accent" /> Karachi, Pakistan
              </span>
              <span>·</span>
              <span>Instant availability</span>
              <span>·</span>
              <span>Secure wallet checkout</span>
            </div>
          </div>
          <div className="relative hidden min-h-80 lg:block">
            <div className="absolute inset-8 rotate-3 rounded-[3rem] border border-accent/30 bg-accent/10" />
            <div className="absolute inset-0 flex flex-col justify-end rounded-[3rem] border border-background/10 bg-background/5 p-8 backdrop-blur-sm">
              <div className="mb-auto flex items-center justify-between">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                  LIVE COURTS
                </span>
                <span className="text-xs text-background/50">Updated in real time</span>
              </div>
              <div className="rounded-2xl border border-background/10 bg-background/10 p-5 backdrop-blur-md">
                <div className="h-3 w-24 rounded-full bg-background/20" />
                <div className="mt-3 h-8 w-48 rounded-lg bg-background/15" />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-xl bg-accent/20" />
                  <div className="h-16 rounded-xl bg-background/10" />
                  <div className="h-16 rounded-xl bg-background/10" />
                </div>
                <div className="mt-5 h-2 w-4/5 rounded-full bg-background/15" />
                <div className="mt-2 h-2 w-3/5 rounded-full bg-background/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
              {mode === "nearby" ? "Explore nearby" : "Browse all venues"}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
              Find your next court
            </h2>
            <p className="mt-2 text-muted-foreground">
              {mode === "nearby"
                ? `Published venues within ${radiusKm} km, closest first.`
                : "Every published venue, ordered by rating."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              value={sport}
              onValueChange={setSport}
              disabled={sportOptions.length === 0}
            >
              <SelectTrigger className="w-full sm:w-52" aria-label="Filter by sport">
                <SelectValue placeholder="Filter sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sports</SelectItem>
                {sportOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1 rounded-lg border p-1">
              <Button
                size="sm"
                variant={mode === "nearby" ? "secondary" : "ghost"}
                onClick={() => setMode("nearby")}
              >
                Nearby
              </Button>
              <Button
                size="sm"
                variant={mode === "all" ? "secondary" : "ghost"}
                onClick={() => setMode("all")}
              >
                All
              </Button>
            </div>
          </div>
        </div>

        {mode === "nearby" && (locationError || origin?.isFallback) ? (
          <Notice
            tone="info"
            title="Using central Karachi"
            className="mt-8"
            action={
              <Button size="sm" variant="outline" onClick={requestLocation} disabled={isLocating}>
                <LocateFixed />
                {isLocating ? "Locating…" : "Use my location"}
              </Button>
            }
          >
            {locationError ??
              "Location access is off, so results are centred on the documented Karachi fallback point."}
          </Notice>
        ) : null}

        {!isSupabaseConfigured() ? (
          <Notice tone="warning" title="Connect your backend" className="mt-8">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to load
            live venues.
          </Notice>
        ) : null}

        {activeQuery.isPending ? <LoadingState label="Finding venues" /> : null}
        {activeQuery.isError ? (
          <Notice tone="error" title="Could not load venues" className="mt-8">
            {activeQuery.error.message}
          </Notice>
        ) : null}

        {!activeQuery.isPending && !activeQuery.isError && !showList ? (
          <EmptyState
            className="mt-8"
            title="No venues match yet"
            description={
              isSupabaseConfigured()
                ? sport === "all"
                  ? "Try the All tab, or search a different area. New venues appear here after they are published."
                  : "No published venue currently offers that sport."
                : "Your venue cards will appear once Supabase is connected."
            }
          />
        ) : null}

        {mode === "nearby" && nearbyVenues.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {nearbyVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                images={venue.images}
                distanceKm={venue.distanceKm}
              />
            ))}
          </div>
        ) : null}

        {mode === "all" && allQuery.data && allQuery.data.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {allQuery.data.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}
