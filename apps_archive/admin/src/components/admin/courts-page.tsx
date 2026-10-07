"use client"

import { useMemo, useState } from "react"
import { Loader2, Save, Search, Swords } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { useAllCourts, useUpdateCourtMutation } from "@/hooks/use-data"
import { formatCurrency, getErrorMessage } from "@/lib/utils"

interface CourtDraft {
  name: string
  sport_type: string
  hourly_rate: string
}

export function CourtsPage() {
  const courtsQuery = useAllCourts()
  const mutation = useUpdateCourtMutation()
  const [search, setSearch] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, CourtDraft>>({})

  const courts = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const rows = courtsQuery.data ?? []
    if (!needle) return rows
    return rows.filter(
      (court) =>
        court.venueName.toLowerCase().includes(needle) ||
        court.name.toLowerCase().includes(needle) ||
        (court.sport_type ?? "").toLowerCase().includes(needle),
    )
  }, [courtsQuery.data, search])

  function draftFor(courtId: string, name: string, sportType: string | null, rate: number | string | null) {
    return drafts[courtId] ?? {
      name,
      sport_type: sportType ?? "",
      hourly_rate: rate === null || rate === undefined ? "" : String(rate),
    }
  }

  function updateDraft(courtId: string, patch: Partial<CourtDraft>) {
    setSavedId(null)
    setDrafts((current) => ({
      ...current,
      [courtId]: {
        ...(current[courtId] ?? { name: "", sport_type: "", hourly_rate: "" }),
        ...patch,
      },
    }))
  }

  async function handleSave(courtId: string) {
    setActionError(null)
    setSavedId(null)
    const draft = drafts[courtId]
    if (!draft) return
    const rate = Number(draft.hourly_rate)
    if (!Number.isFinite(rate) || rate <= 0) {
      setActionError("Hourly rate must be a positive number.")
      return
    }
    try {
      await mutation.mutateAsync({
        courtId,
        values: {
          name: draft.name.trim(),
          sport_type: draft.sport_type.trim() || null,
          hourly_rate: rate,
        },
      })
      setDrafts((current) => {
        const next = { ...current }
        delete next[courtId]
        return next
      })
      setSavedId(courtId)
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  if (courtsQuery.isPending) return <LoadingState label="Loading courts" />
  if (courtsQuery.isError) {
    return (
      <Notice tone="error" title="Could not load courts">
        {courtsQuery.error.message}
      </Notice>
    )
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Inventory
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Courts</h1>
        <p className="mt-2 text-muted-foreground">
          Platform-wide court records. `sport_type` is free text because no sports table exists,
          so keep the label consistent with what the customer app shows.
        </p>
      </div>

      {actionError ? (
        <Notice tone="error" title="Could not save the court">
          {actionError}
        </Notice>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Swords className="size-5 text-primary" />
              <CardTitle>{courts.length} courts</CardTitle>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search courts"
                placeholder="Search court, venue, or sport"
                className="pl-9 sm:w-72"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {courts.length === 0 ? (
            <EmptyState
              title="No matching courts"
              description="Adjust the search to widen the result set."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Hourly rate</TableHead>
                  <TableHead className="text-right">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courts.map((court) => {
                  const draft = draftFor(
                    court.id,
                    court.name,
                    court.sport_type,
                    court.hourly_rate,
                  )
                  const busy = mutation.isPending && mutation.variables?.courtId === court.id
                  const dirty = drafts[court.id] !== undefined
                  return (
                    <TableRow key={court.id}>
                      <TableCell className="text-muted-foreground">{court.venueName}</TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Name for ${court.name}`}
                          className="min-w-40"
                          value={draft.name}
                          onChange={(event) =>
                            updateDraft(court.id, { name: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Sport for ${court.name}`}
                          className="min-w-32"
                          placeholder="e.g. football"
                          value={draft.sport_type}
                          onChange={(event) =>
                            updateDraft(court.id, { sport_type: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Hourly rate for ${court.name}`}
                          className="min-w-28"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="1"
                          value={draft.hourly_rate}
                          onChange={(event) =>
                            updateDraft(court.id, { hourly_rate: event.target.value })
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          stored {formatCurrency(Number(court.hourly_rate))}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {savedId === court.id ? (
                            <span className="text-xs font-semibold text-emerald-700">
                              Saved
                            </span>
                          ) : null}
                          <Button
                            size="sm"
                            disabled={!dirty || busy}
                            onClick={() => void handleSave(court.id)}
                          >
                            {busy ? <Loader2 className="animate-spin" /> : <Save />}
                            Save
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
