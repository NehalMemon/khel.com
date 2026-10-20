"use client"

import { useState, type FormEvent } from "react"
import { Boxes, LoaderCircle, Pencil, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Notice } from "@/components/app/notice"
import { EmptyState } from "@/components/app/loading-state"
import { useCreateResourceMutation, useUpdateResourceMutation } from "@/hooks/use-partner-data"
import type { ResourceRow } from "@/lib/database.types"
import type { VenueWithResources } from "@/lib/queries/partner"
import { formatCurrency, getErrorMessage } from "@/lib/utils"

type FormState = { venueId: string; name: string; category: string; rate: string }
const emptyForm: FormState = { venueId: "", name: "", category: "", rate: "" }

/**
 * Flat resource editor (the legacy `/partner/courts` screen). Hierarchical
 * inventory — rooms with assets nested inside — lives in the visual designer
 * at `/partner/resources`; this stays a quick spreadsheet-style list.
 */
export function CourtManager({ venues }: { venues: VenueWithResources[] }) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<ResourceRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const createMutation = useCreateResourceMutation()
  const updateMutation = useUpdateResourceMutation()
  const isPending = createMutation.isPending || updateMutation.isPending
  const selectedVenueId = venues.some((venue) => venue.id === form.venueId) ? form.venueId : venues[0]?.id ?? ""
  // `sports` is not a table in the database, so suggestions are derived from the
  // `category` values already stored on this owner's resources.
  const categoryOptions = Array.from(
    new Set(
      venues
        .flatMap((venue) => venue.resources)
        .map((resource) => resource.category)
        .filter((category): category is string => Boolean(category && category.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b))

  function resetForm() {
    setEditing(null)
    setForm({ ...emptyForm, venueId: selectedVenueId })
    setSaved(false)
  }

  function startEdit(resource: ResourceRow) {
    setEditing(resource)
    setForm({ venueId: resource.venue_id, name: resource.name, category: resource.category ?? "", rate: String(resource.hourly_rate) })
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const rate = Number(form.rate)
    if (!selectedVenueId || !form.name.trim() || !form.category.trim() || !Number.isFinite(rate) || rate <= 0) {
      setError("Choose a venue, resource name, category, and a valid hourly rate.")
      return
    }
    const sharedValues = { name: form.name.trim(), category: form.category.trim(), hourly_rate: rate }
    try {
      if (editing) await updateMutation.mutateAsync({ resourceId: editing.id, values: sharedValues })
      else await createMutation.mutateAsync({ ...sharedValues, venue_id: selectedVenueId })
      setSaved(true)
      setEditing(null)
      setForm((current) => ({ ...current, name: "", rate: "" }))
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <div className="grid gap-6">
      <Card><CardHeader className="border-b"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><Boxes className="size-5" /></span><div><CardTitle>{editing ? "Edit resource" : "Add a resource"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Set the category and hourly rate customers will see.</p></div></div></CardHeader><CardContent className="pt-6"><form className="grid gap-5" onSubmit={handleSubmit}>{error ? <Notice tone="error" title="Could not save resource">{error}</Notice> : null}{saved ? <Notice tone="success" title="Resource saved">Your resource list is up to date.</Notice> : null}<div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="court-venue">Venue</Label><Select value={selectedVenueId} disabled={Boolean(editing)} onValueChange={(value) => setForm((current) => ({ ...current, venueId: value }))}><SelectTrigger className="h-11 w-full"><SelectValue placeholder="Choose venue" /></SelectTrigger><SelectContent>{venues.map((venue) => <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="court-name">Resource name</Label><Input id="court-name" value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setSaved(false) }} placeholder="Futsal Court A" className="h-11" /></div></div><div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="court-sport">Category</Label><Input id="court-sport" list="court-sport-options" value={form.category} onChange={(event) => { setForm((current) => ({ ...current, category: event.target.value })); setSaved(false) }} placeholder="Type a category" className="h-11" /><datalist id="court-sport-options">{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist>{categoryOptions.length > 0 ? <p className="text-xs text-muted-foreground">Categories already in use by your venues.</p> : null}</div><div className="grid gap-2"><Label htmlFor="court-rate">Hourly rate (PKR)</Label><Input id="court-rate" type="number" min="1" step="1" value={form.rate} onChange={(event) => { setForm((current) => ({ ...current, rate: event.target.value })); setSaved(false) }} placeholder="2500" className="h-11" /></div></div><div className="flex flex-wrap gap-3"><Button type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="animate-spin" /> : editing ? <Save /> : <Boxes />}{editing ? "Save changes" : "Add resource"}</Button>{editing ? <Button type="button" variant="outline" onClick={resetForm}>Cancel edit</Button> : null}{saved && !editing ? <Button type="button" variant="ghost" onClick={resetForm}>Add another</Button> : null}</div></form></CardContent></Card>
      <div className="grid gap-4">{venues.map((venue) => <Card key={venue.id}><CardHeader className="border-b"><div className="flex items-center justify-between"><div><CardTitle>{venue.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{venue.address}</p></div><span className="text-sm font-semibold">{venue.resources.length} resources</span></div></CardHeader><CardContent className="grid gap-3 pt-5">{venue.resources.length === 0 ? <EmptyState title="No resources yet" description="Add your first resource using the form above." /> : venue.resources.map((resource) => <div key={resource.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{resource.name}</p><p className="mt-1 text-sm text-muted-foreground">{resource.category ?? "Category not set"} · {formatCurrency(resource.hourly_rate)}/hr{resource.parent_id ? " · inside a room" : ""}</p></div><Button variant="outline" size="sm" onClick={() => startEdit(resource)}><Pencil />Edit</Button></div>)}</CardContent></Card>)}</div>
    </div>
  )
}
