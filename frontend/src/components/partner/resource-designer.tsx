"use client"

import { useMemo, useState, type FormEvent } from "react"
import {
  Boxes,
  Building2,
  ChevronRight,
  Crown,
  DoorOpen,
  Layers,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
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
import { EmptyState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import {
  useCreateResourceMutation,
  useDeleteResourceMutation,
  useUpdateResourceMutation,
} from "@/hooks/use-partner-data"
import type { Json, ResourceRow } from "@/lib/database.types"
import type { VenueWithResources } from "@/lib/queries/partner"
import { cn, formatCurrency, getErrorMessage } from "@/lib/utils"

/** A venue is Pro when `venues.subscription_tier === 'pro'`. */
function isProVenue(tier: string | null | undefined): boolean {
  return tier?.toLowerCase() === "pro"
}

type EditorMode = "asset" | "room"

type EditorState = {
  resourceId: string | null
  mode: EditorMode
  name: string
  category: string
  rate: string
  parentId: string
  capacity: string
  bookingModel: string
}

function emptyEditor(mode: EditorMode, parentId = ""): EditorState {
  return {
    resourceId: null,
    mode,
    name: "",
    category: "",
    rate: "",
    parentId,
    capacity: "",
    bookingModel: "",
  }
}

function readMetadata(resource: ResourceRow): { capacity?: number; booking_model?: string } {
  const metadata = resource.metadata
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {}
  const bag = metadata as Record<string, Json | undefined>
  const capacity = bag.capacity
  const bookingModel = bag.booking_model
  return {
    capacity: typeof capacity === "number" ? capacity : undefined,
    booking_model: typeof bookingModel === "string" ? bookingModel : undefined,
  }
}

/**
 * Visual resource designer for one venue.
 *
 * The inventory model is an adjacency list (`resources.parent_id`): top-level
 * rows are either a flat asset ("PC 1") or a composite zone ("VIP Room"), and
 * rows whose `parent_id` points at a zone are the assets inside it ("VIP PC 1").
 * The designer renders that as a two-level tree so an owner can see what
 * customers will actually be shown, rather than a flat table.
 *
 * Pro-tier fields (`metadata.capacity`, `metadata.booking_model`) are only
 * offered when the venue's `subscription_tier` is `pro`. The gate is a UI
 * affordance — existing metadata is still displayed so nothing silently
 * disappears if a venue is downgraded.
 */
export function ResourceDesigner({ venues }: { venues: VenueWithResources[] }) {
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "")
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const createMutation = useCreateResourceMutation()
  const updateMutation = useUpdateResourceMutation()
  const deleteMutation = useDeleteResourceMutation()
  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const venue = useMemo(
    () => venues.find((candidate) => candidate.id === venueId) ?? venues[0],
    [venueId, venues],
  )
  const pro = isProVenue(venue?.subscription_tier)

  const { roots, childrenByParent } = useMemo(() => {
    const resources = venue?.resources ?? []
    const childrenByParent = new Map<string, ResourceRow[]>()
    const roots: ResourceRow[] = []
    for (const resource of resources) {
      if (resource.parent_id) {
        const bucket = childrenByParent.get(resource.parent_id) ?? []
        bucket.push(resource)
        childrenByParent.set(resource.parent_id, bucket)
      } else {
        roots.push(resource)
      }
    }
    // Guard against orphans: a child whose parent is outside this venue would
    // otherwise vanish from the tree entirely.
    const ids = new Set(resources.map((resource) => resource.id))
    for (const resource of resources) {
      if (resource.parent_id && !ids.has(resource.parent_id)) roots.push(resource)
    }
    const byName = (a: ResourceRow, b: ResourceRow) => a.name.localeCompare(b.name)
    roots.sort(byName)
    for (const bucket of childrenByParent.values()) bucket.sort(byName)
    return { roots, childrenByParent }
  }, [venue])

  const roomOptions = roots
  const categoryOptions = Array.from(
    new Set(
      (venue?.resources ?? [])
        .map((resource) => resource.category)
        .filter((category): category is string => Boolean(category && category.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b))

  function startAdd(mode: EditorMode, parentId = "") {
    setError(null)
    setNotice(null)
    const parent = parentId ? roots.find((root) => root.id === parentId) : undefined
    setEditor({
      ...emptyEditor(mode, parentId),
      category: parent?.category ?? "",
    })
  }

  function startEdit(resource: ResourceRow) {
    setError(null)
    setNotice(null)
    const metadata = readMetadata(resource)
    const hasChildren = (childrenByParent.get(resource.id)?.length ?? 0) > 0
    setEditor({
      resourceId: resource.id,
      mode: hasChildren ? "room" : "asset",
      name: resource.name,
      category: resource.category ?? "",
      rate: String(resource.hourly_rate),
      parentId: resource.parent_id ?? "",
      capacity: metadata.capacity !== undefined ? String(metadata.capacity) : "",
      bookingModel: metadata.booking_model ?? "",
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor || !venue) return
    setError(null)
    setNotice(null)
    const rate = Number(editor.rate)
    if (!editor.name.trim() || !editor.category.trim() || !Number.isFinite(rate) || rate < 0) {
      setError("Enter a resource name, a category, and a valid hourly rate.")
      return
    }
    if (editor.mode === "asset" && editor.resourceId && editor.parentId === editor.resourceId) {
      setError("A resource cannot be its own parent.")
      return
    }

    // Only assemble Pro fields when the venue is entitled, so a stale form value
    // can never write metadata a downgraded venue is not paying for.
    let metadata: Json | undefined
    if (pro) {
      const capacity = Number(editor.capacity)
      metadata = {
        ...(Number.isFinite(capacity) && editor.capacity.trim() ? { capacity } : {}),
        ...(editor.bookingModel.trim() ? { booking_model: editor.bookingModel.trim() } : {}),
      }
    }

    const parentId = editor.mode === "room" ? null : editor.parentId || null
    try {
      if (editor.resourceId) {
        await updateMutation.mutateAsync({
          resourceId: editor.resourceId,
          values: {
            name: editor.name.trim(),
            category: editor.category.trim(),
            hourly_rate: rate,
            parent_id: parentId,
            ...(pro ? { metadata } : {}),
          },
        })
        setNotice(`${editor.name.trim()} updated.`)
      } else {
        await createMutation.mutateAsync({
          venue_id: venue.id,
          name: editor.name.trim(),
          category: editor.category.trim(),
          hourly_rate: rate,
          parent_id: parentId,
          ...(pro ? { metadata } : {}),
        })
        setNotice(
          editor.mode === "room"
            ? `Room “${editor.name.trim()}” created. Add assets inside it next.`
            : `${editor.name.trim()} added.`,
        )
      }
      setEditor(null)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  async function handleDelete(resource: ResourceRow) {
    const childCount = childrenByParent.get(resource.id)?.length ?? 0
    const confirmed = window.confirm(
      childCount > 0
        ? `Delete “${resource.name}” and its ${childCount} nested resource(s)? This cannot be undone.`
        : `Delete “${resource.name}”? This cannot be undone.`,
    )
    if (!confirmed) return
    setError(null)
    setNotice(null)
    try {
      await deleteMutation.mutateAsync(resource.id)
      setNotice(`${resource.name} deleted.`)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  if (!venue) return null

  return (
    <div className="grid gap-6">
      {error ? <Notice tone="error" title="Could not save changes">{error}</Notice> : null}
      {notice ? <Notice tone="success" title="Inventory updated">{notice}</Notice> : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Layers className="size-5" />
              </span>
              <div>
                <CardTitle>Layout designer</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Build flat assets or group them into rooms and zones.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pro ? (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="size-3" />
                  Pro tools on
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Crown className="size-3" />
                  Pro tools locked
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="resource-venue">Venue</Label>
            <Select
              value={venue.id}
              onValueChange={(value) => {
                setVenueId(value)
                setEditor(null)
                setError(null)
                setNotice(null)
              }}
              disabled={venues.length < 2}
            >
              <SelectTrigger className="h-11 w-full">
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => startAdd("asset")}>
              <Plus />
              Add asset
            </Button>
            <Button variant="outline" onClick={() => startAdd("room")}>
              <DoorOpen />
              Add room / zone
            </Button>
          </div>
        </CardContent>
      </Card>

      {editor ? (
        <ResourceEditorCard
          editor={editor}
          pro={pro}
          venueName={venue.name}
          rooms={roomOptions}
          categoryOptions={categoryOptions}
          isPending={isPending}
          onChange={setEditor}
          onCancel={() => setEditor(null)}
          onSubmit={handleSubmit}
        />
      ) : null}

      <div className="grid gap-4">
        {roots.length === 0 ? (
          <EmptyState
            title="No resources yet"
            description="Add your first asset, or create a room and nest assets inside it."
            action={<Button onClick={() => startAdd("asset")}><Plus />Add asset</Button>}
          />
        ) : (
          roots.map((resource) => (
            <ResourceTreeCard
              key={resource.id}
              resource={resource}
              nested={childrenByParent.get(resource.id) ?? []}
              pro={pro}
              isPending={isPending}
              onEdit={startEdit}
              onDelete={handleDelete}
              onAddChild={(parentId) => startAdd("asset", parentId)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ResourceEditorCard({
  editor,
  pro,
  venueName,
  rooms,
  categoryOptions,
  isPending,
  onChange,
  onCancel,
  onSubmit,
}: {
  editor: EditorState
  pro: boolean
  venueName: string
  rooms: ResourceRow[]
  categoryOptions: string[]
  isPending: boolean
  onChange: (next: EditorState) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const isRoom = editor.mode === "room"
  const parentRoom = editor.parentId
    ? rooms.find((room) => room.id === editor.parentId)
    : undefined

  return (
    <Card className="border-primary/30">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isRoom ? <DoorOpen className="size-5" /> : <Boxes className="size-5" />}
            </span>
            <div>
              <CardTitle>
                {editor.resourceId ? "Edit" : "New"} {isRoom ? "room / zone" : "asset"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {isRoom
                  ? `Grouped inventory in ${venueName}. Customers book the assets inside it.`
                  : parentRoom
                    ? `Nested inside “${parentRoom.name}”.`
                    : `A standalone bookable unit in ${venueName}.`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close editor" onClick={onCancel}>
            <X />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="resource-name">Name</Label>
              <Input
                id="resource-name"
                value={editor.name}
                onChange={(event) => onChange({ ...editor, name: event.target.value })}
                placeholder={isRoom ? "VIP Room" : "PC 1"}
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resource-category">Category</Label>
              <Input
                id="resource-category"
                list="resource-category-options"
                value={editor.category}
                onChange={(event) => onChange({ ...editor, category: event.target.value })}
                placeholder="Gaming"
                className="h-11"
              />
              <datalist id="resource-category-options">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="resource-rate">Hourly rate (PKR)</Label>
              <Input
                id="resource-rate"
                inputMode="numeric"
                value={editor.rate}
                onChange={(event) => onChange({ ...editor, rate: event.target.value })}
                placeholder="800"
                className="h-11"
              />
            </div>
            {!isRoom ? (
              <div className="grid gap-2">
                <Label htmlFor="resource-parent">Nested inside</Label>
                <Select
                  value={editor.parentId || "none"}
                  onValueChange={(value) =>
                    onChange({ ...editor, parentId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger id="resource-parent" className="h-11 w-full">
                    <SelectValue placeholder="Standalone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Standalone (no room)</SelectItem>
                    {rooms
                      .filter((room) => room.id !== editor.resourceId)
                      .map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <Crown className={cn("size-4", pro ? "text-primary" : "text-muted-foreground")} />
              <p className="text-sm font-semibold">Advanced pricing metadata</p>
              {!pro ? <Badge variant="outline">Pro</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {pro
                ? "Optional fields used by packages, capacity limits, and night-owl pricing."
                : "Upgrade this venue to Pro to set capacity and a booking model."}
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="resource-capacity">Capacity</Label>
                <Input
                  id="resource-capacity"
                  inputMode="numeric"
                  value={editor.capacity}
                  onChange={(event) => onChange({ ...editor, capacity: event.target.value })}
                  placeholder="4"
                  disabled={!pro}
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="resource-model">Booking model</Label>
                <Input
                  id="resource-model"
                  value={editor.bookingModel}
                  onChange={(event) => onChange({ ...editor, bookingModel: event.target.value })}
                  placeholder="hourly"
                  disabled={!pro}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <LoaderCircle className="animate-spin" /> : <Pencil />}
              {editor.resourceId ? "Save changes" : isRoom ? "Create room" : "Add asset"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ResourceTreeCard({
  resource,
  nested,
  pro,
  isPending,
  onEdit,
  onDelete,
  onAddChild,
}: {
  resource: ResourceRow
  nested: ResourceRow[]
  pro: boolean
  isPending: boolean
  onEdit: (resource: ResourceRow) => void
  onDelete: (resource: ResourceRow) => void
  onAddChild: (parentId: string) => void
}) {
  const isRoom = nested.length > 0
  const metadata = readMetadata(resource)

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              {isRoom ? <DoorOpen className="size-4" /> : <Boxes className="size-4" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{resource.name}</CardTitle>
                {isRoom ? <Badge variant="secondary">Room · {nested.length}</Badge> : null}
                {resource.is_active === false ? <Badge variant="destructive">Inactive</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {resource.category ?? "Category not set"} · {formatCurrency(resource.hourly_rate)}/hr
                {metadata.capacity !== undefined ? ` · seats ${metadata.capacity}` : ""}
                {metadata.booking_model ? ` · ${metadata.booking_model}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isRoom ? (
              <Button size="sm" variant="outline" onClick={() => onAddChild(resource.id)}>
                <Plus />
                Add asset inside
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => onEdit(resource)}>
              <Pencil />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/5"
              disabled={isPending}
              onClick={() => onDelete(resource)}
            >
              <Trash2 />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      {isRoom ? (
        <CardContent className="grid gap-2 pt-5">
          {nested.map((child) => {
            const childMetadata = readMetadata(child)
            return (
              <div
                key={child.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 pl-5"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className="size-4 text-muted-foreground" />
                  <Building2 className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">{child.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {child.category ?? "Category not set"} ·{" "}
                      {formatCurrency(child.hourly_rate)}/hr
                      {childMetadata.capacity !== undefined
                        ? ` · seats ${childMetadata.capacity}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(child)}>
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/5"
                    disabled={isPending}
                    onClick={() => onDelete(child)}
                  >
                    <Trash2 />
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
          {!pro ? (
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Crown className="size-3" />
              Capacity and booking model on nested assets are Pro features.
            </p>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  )
}
