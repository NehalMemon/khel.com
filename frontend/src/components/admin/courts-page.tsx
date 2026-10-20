"use client"

import { useMemo, useState } from "react"
import { Loader2, Save, Search, Boxes } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { useAllResources, useUpdateResourceMutation } from "@/hooks/use-admin-data"
import { formatCurrency, getErrorMessage } from "@/lib/utils"

interface ResourceDraft {
  name: string
  category: string
  hourly_rate: string
}

export function CourtsPage() {
  const resourcesQuery = useAllResources()
  const mutation = useUpdateResourceMutation()
  const [search, setSearch] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, ResourceDraft>>({})

  const resources = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const rows = resourcesQuery.data ?? []
    if (!needle) return rows
    return rows.filter(
      (resource) =>
        resource.venueName.toLowerCase().includes(needle) ||
        resource.name.toLowerCase().includes(needle) ||
        (resource.category ?? "").toLowerCase().includes(needle),
    )
  }, [resourcesQuery.data, search])

  function draftFor(resourceId: string, name: string, category: string | null, rate: number | string | null) {
    return drafts[resourceId] ?? {
      name,
      category: category ?? "",
      hourly_rate: rate === null || rate === undefined ? "" : String(rate),
    }
  }

  function updateDraft(resourceId: string, patch: Partial<ResourceDraft>) {
    setSavedId(null)
    setDrafts((current) => ({
      ...current,
      [resourceId]: {
        ...(current[resourceId] ?? { name: "", category: "", hourly_rate: "" }),
        ...patch,
      },
    }))
  }

  async function handleSave(resourceId: string) {
    setActionError(null)
    setSavedId(null)
    const draft = drafts[resourceId]
    if (!draft) return
    const rate = Number(draft.hourly_rate)
    if (!Number.isFinite(rate) || rate <= 0) {
      setActionError("Hourly rate must be a positive number.")
      return
    }
    try {
      await mutation.mutateAsync({
        resourceId,
        values: {
          name: draft.name.trim(),
          category: draft.category.trim() || null,
          hourly_rate: rate,
        },
      })
      setDrafts((current) => {
        const next = { ...current }
        delete next[resourceId]
        return next
      })
      setSavedId(resourceId)
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  if (resourcesQuery.isPending) return <LoadingState label="Loading resources" />
  if (resourcesQuery.isError) {
    return (
      <Notice tone="error" title="Could not load resources">
        {resourcesQuery.error.message}
      </Notice>
    )
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Inventory
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Resources</h1>
        <p className="mt-2 text-muted-foreground">
          Platform-wide bookable resources. `category` is free text (no sports table exists),
          so keep the label consistent with what the customer app shows.
        </p>
      </div>

      {actionError ? (
        <Notice tone="error" title="Could not save the resource">
          {actionError}
        </Notice>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Boxes className="size-5 text-primary" />
              <CardTitle>{resources.length} resources</CardTitle>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search resources"
                placeholder="Search resource, venue, or category"
                className="pl-9 sm:w-72"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {resources.length === 0 ? (
            <EmptyState
              title="No matching resources"
              description="Adjust the search to widen the result set."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Hourly rate</TableHead>
                  <TableHead className="text-right">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => {
                  const draft = draftFor(
                    resource.id,
                    resource.name,
                    resource.category,
                    resource.hourly_rate,
                  )
                  const busy = mutation.isPending && mutation.variables?.resourceId === resource.id
                  const dirty = drafts[resource.id] !== undefined
                  return (
                    <TableRow key={resource.id}>
                      <TableCell className="text-muted-foreground">{resource.venueName}</TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Name for ${resource.name}`}
                          className="min-w-40"
                          value={draft.name}
                          onChange={(event) =>
                            updateDraft(resource.id, { name: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Category for ${resource.name}`}
                          className="min-w-32"
                          placeholder="e.g. football"
                          value={draft.category}
                          onChange={(event) =>
                            updateDraft(resource.id, { category: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Hourly rate for ${resource.name}`}
                          className="min-w-28"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="1"
                          value={draft.hourly_rate}
                          onChange={(event) =>
                            updateDraft(resource.id, { hourly_rate: event.target.value })
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          stored {formatCurrency(Number(resource.hourly_rate))}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {savedId === resource.id ? (
                            <span className="text-xs font-semibold text-emerald-700">
                              Saved
                            </span>
                          ) : null}
                          <Button
                            size="sm"
                            disabled={!dirty || busy}
                            onClick={() => void handleSave(resource.id)}
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
