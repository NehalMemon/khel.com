import Link from "next/link"
import { ArrowUpRight, MapPin, Star } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PublicVenueWithCourts } from "@/lib/queries/customer"
import { formatCurrency } from "@/lib/utils"

function getAmenityCount(amenities: unknown): number {
  if (!amenities || typeof amenities !== "object" || Array.isArray(amenities)) return 0
  return Object.keys(amenities).filter((key) => {
    const value = (amenities as Record<string, unknown>)[key]
    return value === true || value === "true" || value === 1
  }).length
}

export function VenueCard({
  venue,
  images,
  distanceKm,
}: {
  venue: PublicVenueWithCourts
  /** Supplied by `search_venues_nearby`, which projects `amenities->'images'`. */
  images?: string[]
  distanceKm?: number
}) {
  const sportTypes = Array.from(
    new Set(
      venue.courts
        .map((court) => court.sport_type)
        .filter((sport): sport is string => Boolean(sport)),
    ),
  )
  const lowestRate = venue.courts.length
    ? Math.min(...venue.courts.map((court) => court.hourly_rate))
    : null
  const cover = images?.find((image) => typeof image === "string" && image.length > 0)
  return (
    <Card className="group h-full overflow-hidden border-foreground/8 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className="relative flex h-44 items-end overflow-hidden bg-primary p-5 text-primary-foreground">
        {cover ? (
          // Cloudinary is the only image host used by the marketplace and is
          // allowlisted in next.config.ts.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={venue.name}
            className="absolute inset-0 size-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/60 to-primary/20" />
        <div className="absolute -right-8 -top-12 size-40 rounded-full border-[22px] border-accent/20" />
        <div className="absolute -bottom-16 right-20 size-32 rounded-full border-[18px] border-white/10" />
        <div className="relative w-full">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-white/15 text-white hover:bg-white/20">
              {venue.status === "published" ? "Open for booking" : venue.status}
            </Badge>
            {distanceKm !== undefined ? (
              <Badge variant="secondary" className="bg-white/15 text-white hover:bg-white/20">
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`}
              </Badge>
            ) : null}
          </div>
          <h2 className="max-w-[15rem] text-2xl font-black tracking-[-0.05em]">{venue.name}</h2>
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col gap-4 pt-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="truncate">{venue.address}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sportTypes.slice(0, 3).map((sport) => (
            <Badge key={sport} variant="secondary">{sport}</Badge>
          ))}
          {sportTypes.length === 0 ? <span className="text-sm text-muted-foreground">Sports listed at checkout</span> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-1 font-semibold">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            {Number(venue.avg_rating).toFixed(1)}
            <span className="font-normal text-muted-foreground">({getAmenityCount(venue.amenities)} amenities)</span>
          </span>
          {lowestRate !== null ? (
            <span className="text-right text-xs text-muted-foreground">from <strong className="text-sm text-foreground">{formatCurrency(lowestRate)}</strong>/hr</span>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t-0 bg-transparent pt-0">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/venues/${venue.slug}`}>
            View venue
            <ArrowUpRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
