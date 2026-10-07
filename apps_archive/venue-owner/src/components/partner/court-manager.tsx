"use client"

import { useState, type FormEvent } from "react"
import { Dumbbell, LoaderCircle, Pencil, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Notice } from "@/components/app/notice"
import { EmptyState } from "@/components/app/loading-state"
import { useCreateCourtMutation, useUpdateCourtMutation } from "@/hooks/use-data"
import type { CourtRow } from "@/lib/database.types"
import type { VenueWithCourts } from "@/lib/queries"
import { formatCurrency, getErrorMessage } from "@/lib/utils"

type FormState = { venueId: string; name: string; sport: string; rate: string }
const emptyForm: FormState = { venueId: "", name: "", sport: "", rate: "" }

export function CourtManager({ venues }: { venues: VenueWithCourts[] }) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<CourtRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const createMutation = useCreateCourtMutation()
  const updateMutation = useUpdateCourtMutation()
  const isPending = createMutation.isPending || updateMutation.isPending
  const selectedVenueId = venues.some((venue) => venue.id === form.venueId) ? form.venueId : venues[0]?.id ?? ""
  // `sports` is not a table in the database, so suggestions are derived from the
  // `sport_type` values already stored on this owner's courts.
  const sportOptions = Array.from(
    new Set(
      venues
        .flatMap((venue) => venue.courts)
        .map((court) => court.sport_type)
        .filter((sport): sport is string => Boolean(sport && sport.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b))

  function resetForm() {
    setEditing(null)
    setForm({ ...emptyForm, venueId: selectedVenueId })
    setSaved(false)
  }

  function startEdit(court: CourtRow) {
    setEditing(court)
    setForm({ venueId: court.venue_id, name: court.name, sport: court.sport_type ?? "", rate: String(court.hourly_rate) })
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const rate = Number(form.rate)
    if (!selectedVenueId || !form.name.trim() || !form.sport.trim() || !Number.isFinite(rate) || rate <= 0) {
      setError("Choose a venue, court name, sport, and a valid hourly rate.")
      return
    }
    const sharedValues = { name: form.name.trim(), sport_type: form.sport.trim(), hourly_rate: rate }
    try {
      if (editing) await updateMutation.mutateAsync({ courtId: editing.id, values: sharedValues })
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
      <Card><CardHeader className="border-b"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><Dumbbell className="size-5" /></span><div><CardTitle>{editing ? "Edit court" : "Add a court"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Set the sport and hourly rate customers will see.</p></div></div></CardHeader><CardContent className="pt-6"><form className="grid gap-5" onSubmit={handleSubmit}>{error ? <Notice tone="error" title="Could not save court">{error}</Notice> : null}{saved ? <Notice tone="success" title="Court saved">Your court list is up to date.</Notice> : null}<div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="court-venue">Venue</Label><Select value={selectedVenueId} disabled={Boolean(editing)} onValueChange={(value) => setForm((current) => ({ ...current, venueId: value }))}><SelectTrigger className="h-11 w-full"><SelectValue placeholder="Choose venue" /></SelectTrigger><SelectContent>{venues.map((venue) => <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="court-name">Court name</Label><Input id="court-name" value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setSaved(false) }} placeholder="Futsal Court A" className="h-11" /></div></div><div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="court-sport">Sport</Label><Input id="court-sport" list="court-sport-options" value={form.sport} onChange={(event) => { setForm((current) => ({ ...current, sport: event.target.value })); setSaved(false) }} placeholder="Type a sport" className="h-11" /><datalist id="court-sport-options">{sportOptions.map((sport) => <option key={sport} value={sport} />)}</datalist>{sportOptions.length > 0 ? <p className="text-xs text-muted-foreground">Sports already used on your courts are suggested. There is no sports table in the database, so this list grows from your own inventory.</p> : null}</div><div className="grid gap-2"><Label htmlFor="court-rate">Hourly rate (PKR)</Label><Input id="court-rate" type="number" min="1" step="1" value={form.rate} onChange={(event) => { setForm((current) => ({ ...current, rate: event.target.value })); setSaved(false) }} placeholder="e.g. 3000" className="h-11" /></div></div><div className="flex justify-end gap-2 border-t pt-5">{editing ? <Button type="button" variant="ghost" onClick={resetForm}>Cancel edit</Button> : null}<Button type="submit" disabled={isPending}>{isPending ? <><LoaderCircle className="animate-spin" />Saving…</> : <>{editing ? <Save /> : <Plus />}{editing ? "Save court" : "Add court"}</>}</Button></div></form></CardContent></Card>
      <div className="grid gap-4">{venues.map((venue) => <Card key={venue.id}><CardHeader className="border-b"><div className="flex items-center justify-between"><div><CardTitle>{venue.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{venue.address}</p></div><span className="text-sm font-semibold">{venue.courts.length} courts</span></div></CardHeader><CardContent className="grid gap-3 pt-5">{venue.courts.length === 0 ? <EmptyState title="No courts yet" description="Add your first court using the form above." /> : venue.courts.map((court) => <div key={court.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{court.name}</p><p className="mt-1 text-sm text-muted-foreground">{court.sport_type ?? "Sport not set"} · {formatCurrency(court.hourly_rate)}/hr</p></div><Button variant="outline" size="sm" onClick={() => startEdit(court)}><Pencil />Edit</Button></div>)}</CardContent></Card>)}</div>
    </div>
  )
}
