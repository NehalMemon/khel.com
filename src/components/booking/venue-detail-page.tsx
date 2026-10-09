"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, MapPin, Star, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Notice } from "@/components/app/notice"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { useVenue } from "@/hooks/use-customer-data"
import { useAuth } from "@/components/auth/auth-provider"
import { isSupabaseConfigured } from "@/lib/supabase-browser"
import { formatCurrency } from "@/lib/utils"

function getAmenities(amenities: unknown): string[] {
  if (!amenities || typeof amenities !== "object" || Array.isArray(amenities)) return []
  return Object.entries(amenities as Record<string, unknown>)
    .filter(([, value]) => value === true || value === "true" || value === 1)
    .map(([key]) => key.replaceAll("_", " "))
}

export function VenueDetailPage({ slug }: { slug: string }) {
  const venueQuery = useVenue(slug)
  const { profile } = useAuth()

  if (!isSupabaseConfigured()) return <Notice tone="warning" title="Supabase connection required">Add the public Supabase URL and anon key to `apps/user/.env.local` before loading live venue data.</Notice>
  if (venueQuery.isPending) return <LoadingState label="Loading venue" />
  if (venueQuery.isError) return <Notice tone="error" title="Could not load this venue">{venueQuery.error.message}</Notice>
  if (!venueQuery.data) return <EmptyState title="Venue not found" description="This venue may have moved, is not published, or is no longer available." action={<Button asChild><Link href="/">Back to discover</Link></Button>} />

  const venue = venueQuery.data
  const amenities = getAmenities(venue.amenities)
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to discover</Link>
      {profile?.phone.startsWith("pending-") ? <Notice tone="warning" title="Add your mobile number" className="mt-6">Update your profile with a real number before booking or listing a venue.</Notice> : null}
      <section className="mt-7 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div><Badge variant="secondary">Published venue</Badge><h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] sm:text-6xl">{venue.name}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{venue.description ?? "A welcoming indoor space for your next game."}</p><div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" />{venue.address}</span><span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-amber-400 text-amber-400" />{Number(venue.avg_rating).toFixed(1)} rating</span></div></div>
        <div className="rounded-3xl bg-foreground p-6 text-background shadow-xl shadow-primary/10"><p className="text-sm text-background/60">Ready when you are</p><p className="mt-2 text-3xl font-black tracking-[-0.05em]">Pick a court.<br />Pick your time.</p><Button asChild className="mt-6 w-full" variant="secondary"><a href="#courts">See available courts <ArrowRight /></a></Button></div>
      </section>
      <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.45fr]">
        <div id="courts"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Choose your court</p><h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Available courts</h2></div><span className="text-sm text-muted-foreground">{venue.courts.length} {venue.courts.length === 1 ? "court" : "courts"}</span></div>{venue.courts.length === 0 ? <EmptyState className="mt-6" title="Courts coming soon" description="This venue has not published its courts yet." /> : <div className="mt-6 grid gap-4 sm:grid-cols-2">{venue.courts.map((court) => <Card key={court.id} className="border-foreground/8 bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{court.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{court.sport_type ?? "Indoor sport"}</p></div><Badge variant="outline">{formatCurrency(court.hourly_rate)}/hr</Badge></div></CardHeader><CardContent><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" />Instant booking</span><Button size="sm" asChild><Link href={`/venues/${venue.slug}/book?courtId=${court.id}`}>View times <ArrowRight /></Link></Button></div></CardContent></Card>)}</div>}</div>
        <aside className="space-y-5"><Card className="bg-secondary/40"><CardHeader><CardTitle>Good to know</CardTitle></CardHeader><CardContent><ul className="grid gap-3 text-sm text-secondary-foreground">{amenities.length ? amenities.map((amenity) => <li key={amenity} className="flex items-center gap-2 capitalize"><Check className="size-4 text-primary" />{amenity}</li>) : <li className="text-muted-foreground">Amenities are being updated by the venue.</li>}</ul></CardContent></Card><Card><CardHeader><CardTitle>Good sports etiquette</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">Arrive on time, respect the court, and keep your booking details handy when you arrive.</CardContent></Card></aside>
      </section>
    </main>
  )
}
