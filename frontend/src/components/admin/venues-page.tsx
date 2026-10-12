"use client"

import { useMemo, useState } from "react"
import { Building2, MapPin, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { StatusBadge } from "@/components/app/status-badge"
import { useAllVenues } from "@/hooks/use-admin-data"
import type { VenueStatus } from "@/lib/database.types"
import { formatCurrency, formatDateTime, readVenueImages } from "@/lib/utils"

const ALL_STATUSES: VenueStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "published",
  "rejected",
  "suspended",
  "archived",
]

function sportSummary(sports: string[]): string {
  const unique = [...new Set(sports.filter(Boolean))]
  return unique.length === 0 ? "No courts" : unique.join(", ")
}

function hourlyRange(rates: number[]): string {
  const valid = rates.filter((rate) => Number.isFinite(rate) && rate > 0)
  if (valid.length === 0) return "—"
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`
}

export function VenuesPage() {
  const [status, setStatus] = useState<"all" | VenueStatus>("all")
  const venuesQuery = useAllVenues(status === "all" ? undefined : status)
  const [search, setSearch] = useState("")

  const venues = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const rows = venuesQuery.data ?? []
    if (!needle) return rows
    return rows.filter(
      (venue) =>
        venue.name.toLowerCase().includes(needle) ||
        venue.address.toLowerCase().includes(needle),
    )
  }, [search, venuesQuery.data])

  if (venuesQuery.isPending) return <LoadingState label="Loading all venues" />
  if (venuesQuery.isError) {
    return (
      <Notice tone="error" title="Could not load venues">
        {venuesQuery.error.message}
      </Notice>
    )
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Marketplace inventory
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">All venues</h1>
        <p className="mt-2 text-muted-foreground">
          Every venue the platform can see, with its courts. Sports come from
          `courts.sport_type` because there is no sports table.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="size-5 text-primary" />
              <CardTitle>{venues.length} venues</CardTitle>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search venues"
                  placeholder="Search name or address"
                  className="pl-9 sm:w-64"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value === "all" ? "all" : (value as VenueStatus))
                }
              >
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ALL_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {venues.length === 0 ? (
            <EmptyState
              title="No matching venues"
              description="Adjust the search or status filter to widen the result set."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sports</TableHead>
                  <TableHead>Courts</TableHead>
                  <TableHead>Hourly rate</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell>
                      <p className="font-semibold">{venue.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {venue.address}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={venue.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sportSummary(venue.courts.map((court) => court.sport_type ?? ""))}
                    </TableCell>
                    <TableCell>{venue.courts.length}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {hourlyRange(venue.courts.map((court) => Number(court.hourly_rate)))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {readVenueImages(venue.amenities).length}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(venue.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
