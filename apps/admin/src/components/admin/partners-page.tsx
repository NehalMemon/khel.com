"use client"

import { useMemo, useState } from "react"
import { Building2, Search, Store } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { StatusBadge } from "@/components/app/status-badge"
import { useAllVenues, usePartners } from "@/hooks/use-data"
import { formatDateTime, formatPhone, isPendingPhone } from "@/lib/utils"

export function PartnersPage() {
  const partnersQuery = usePartners()
  const venuesQuery = useAllVenues()
  const [search, setSearch] = useState("")

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const partners = partnersQuery.data ?? []
    const venues = venuesQuery.data ?? []
    return partners
      .map((partner) => {
        const owned = venues.filter((venue) => venue.owner_id === partner.id)
        return {
          partner,
          venues: owned,
          liveCount: owned.filter((venue) => venue.status === "published").length,
          courtCount: owned.reduce((total, venue) => total + venue.courts.length, 0),
        }
      })
      .filter((row) => {
        if (!needle) return true
        const label = (row.partner.name ?? row.partner.id).toLowerCase()
        return label.includes(needle) || row.venues.some((v) => v.name.toLowerCase().includes(needle))
      })
      .sort((a, b) => b.courtCount - a.courtCount)
  }, [partnersQuery.data, search, venuesQuery.data])

  if (partnersQuery.isPending || venuesQuery.isPending) {
    return <LoadingState label="Loading venue-owner accounts" />
  }
  if (partnersQuery.isError) {
    return (
      <Notice tone="error" title="Could not load venue owners">
        {partnersQuery.error.message}
      </Notice>
    )
  }
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
          Supply side
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Venue owners</h1>
        <p className="mt-2 text-muted-foreground">
          Accounts with the `venue_owner` role, matched to the venues they own through
          `venues.owner_id`.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Store className="size-5 text-primary" />
              <CardTitle>{rows.length} venue owners</CardTitle>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search venue owners"
                placeholder="Search owner or venue"
                className="pl-9 sm:w-72"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <EmptyState
              title="No matching venue owners"
              description="Adjust the search to widen the result set."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Venues</TableHead>
                  <TableHead>Courts</TableHead>
                  <TableHead>Portfolio</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ partner, venues, liveCount, courtCount }) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <p className="font-semibold">{partner.name ?? `User ${partner.id.slice(0, 8)}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {isPendingPhone(partner.phone)
                          ? "Awaiting phone"
                          : formatPhone(partner.phone) || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={partner.subscription_tier} />
                    </TableCell>
                    <TableCell>
                      {venues.length} ({liveCount} live)
                    </TableCell>
                    <TableCell>{courtCount}</TableCell>
                    <TableCell>
                      {venues.length === 0 ? (
                        <span className="text-muted-foreground">No listings yet</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {venues.slice(0, 3).map((venue) => (
                            <span
                              key={venue.id}
                              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
                            >
                              {venue.name}
                              <StatusBadge status={venue.status} />
                            </span>
                          ))}
                          {venues.length > 3 ? (
                            <span className="px-1 text-xs text-muted-foreground">
                              +{venues.length - 3} more
                            </span>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(partner.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/15">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <Building2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Staff accounts are not included</p>
              <p className="mt-1 text-sm text-muted-foreground">
                `venue_staff` has no RLS policy, so staff-level views cannot be built
                safely until the backend ships tenant policies for them.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/venues/review">Open review queue</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
