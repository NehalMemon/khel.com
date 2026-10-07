"use client"

import { useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Building2, Check, LoaderCircle, MapPin, Plus, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Notice } from "@/components/app/notice"
import { useCreateVenueMutation, useUpdateVenueMutation, useVenueImageUploadMutation } from "@/hooks/use-data"
import type { Json, VenueRow, VenueUpdate } from "@/lib/database.types"
import {
  readVenueImages,
  withVenueImages,
  type PartnerVenueValues,
} from "@/lib/queries"
import { getErrorMessage, KARACHI_FALLBACK, slugify } from "@/lib/utils"

/** Mirrors the Edge Function's accepted folder prefix for venue imagery. */
const VENUE_IMAGE_FOLDER = "venue-images"
const MAX_IMAGES = 8

type FormState = {
  name: string
  slug: string
  address: string
  description: string
  amenities: string
  latitude: string
  longitude: string
  images: string[]
}

function getCoordinateFields(value: unknown): { latitude: string; longitude: string } {
  if (typeof value === "string") {
    const matches = value.match(/-?\d+(?:\.\d+)?/g) ?? []
    return { longitude: matches[0] ?? "", latitude: matches[1] ?? "" }
  }
  if (value && typeof value === "object") {
    const coordinates = (value as { coordinates?: unknown }).coordinates
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const longitude = Number(coordinates[0])
      const latitude = Number(coordinates[1])
      if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
        return { longitude: String(longitude), latitude: String(latitude) }
      }
    }
  }
  return { longitude: "", latitude: "" }
}

function getAmenityNames(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join(", ")
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => enabled === true)
      .map(([name]) => name)
      .join(", ")
  }
  return ""
}

function toAmenityObject(value: string, existing?: unknown): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    for (const [name, enabled] of Object.entries(existing as Record<string, unknown>)) {
      if (typeof enabled === "boolean") result[name] = enabled
    }
  }
  const names = new Set(
    value
      .split(",")
      .map((item) => item.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean),
  )
  for (const [name, enabled] of Object.entries(result)) {
    if (enabled && !names.has(name)) delete result[name]
  }
  for (const name of names) result[name] = true
  return result
}

function getInitialForm(venue?: VenueRow): FormState {
  if (!venue) {
    return {
      name: "",
      slug: "",
      address: "",
      description: "",
      amenities: "",
      latitude: "",
      longitude: "",
      images: [],
    }
  }
  const coordinates = getCoordinateFields(venue.coordinates)
  return {
    name: venue.name,
    slug: venue.slug,
    address: venue.address,
    description: venue.description ?? "",
    amenities: getAmenityNames(venue.amenities),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    images: readVenueImages(venue.amenities),
  }
}

export function VenueManager({
  ownerId,
  venue,
  disabled = false,
}: {
  ownerId: string
  venue?: VenueRow
  disabled?: boolean
}) {
  const [form, setForm] = useState<FormState>(() => getInitialForm(venue))
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createMutation = useCreateVenueMutation(ownerId)
  const updateMutation = useUpdateVenueMutation()
  const uploadMutation = useVenueImageUploadMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" && !venue ? { slug: slugify(value) } : {}),
    }))
    setSaved(false)
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return
    setUploadError(null)
    const remaining = MAX_IMAGES - form.images.length
    if (remaining <= 0) {
      setUploadError(`You can upload up to ${MAX_IMAGES} images per venue.`)
      return
    }
    const accepted = files.slice(0, remaining)
    if (accepted.length < files.length) {
      setUploadError(`Only the first ${remaining} image${remaining === 1 ? "" : "s"} were added.`)
    }
    const uploaded: string[] = []
    for (const file of accepted) {
      try {
        const result = await uploadMutation.mutateAsync({
          file,
          folder: VENUE_IMAGE_FOLDER,
        })
        uploaded.push(result.secure_url)
      } catch (caught) {
        setUploadError(getErrorMessage(caught))
        break
      }
    }
    if (uploaded.length > 0) {
      setForm((current) => ({ ...current, images: [...current.images, ...uploaded] }))
      setSaved(false)
    }
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, position) => position !== index),
    }))
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const latitudeValue = form.latitude.trim()
    const longitudeValue = form.longitude.trim()
    const latitude = Number(latitudeValue)
    const longitude = Number(longitudeValue)
    const slug = slugify(form.slug)
    if (
      !form.name.trim() ||
      !slug ||
      !form.address.trim() ||
      !latitudeValue ||
      !longitudeValue ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Name, slug, address, and valid coordinates are required.")
      return
    }
    // `amenities` carries both the boolean feature flags and the image list that
    // `search_venues_nearby` reads back, so the two are merged on save.
    const amenities = withVenueImages(
      toAmenityObject(form.amenities, venue?.amenities) as unknown as Json,
      form.images,
    )
    const sharedValues = {
      name: form.name.trim(),
      slug,
      address: form.address.trim(),
      description: form.description.trim() || null,
      amenities,
      coordinates: `POINT(${longitude} ${latitude})`,
    }
    try {
      if (venue) {
        const values: VenueUpdate = sharedValues
        await updateMutation.mutateAsync({ venueId: venue.id, values })
      } else {
        const values: PartnerVenueValues = sharedValues
        await createMutation.mutateAsync(values)
        setForm(getInitialForm())
      }
      setSaved(true)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Building2 className="size-5" />
          </span>
          <div>
            <CardTitle>{venue ? "Edit your venue" : "Add a venue"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Your venue is saved as a draft until you submit it for review.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          {disabled ? (
            <Notice tone="warning" title="Profile phone required">
              Add a valid mobile number before creating or updating a venue listing.
            </Notice>
          ) : null}
          {error ? (
            <Notice tone="error" title="Could not save venue">
              {error}
            </Notice>
          ) : null}
          {saved ? (
            <Notice tone="success" title="Venue saved">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" />
                Your changes are saved.
              </span>
            </Notice>
          ) : null}

          <fieldset disabled={disabled} className="grid gap-5 disabled:opacity-70">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="venue-name">Venue name</Label>
                <Input
                  id="venue-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="e.g. Gulshan Sports Hub"
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="venue-slug">Public URL slug</Label>
                <Input
                  id="venue-slug"
                  value={form.slug}
                  onChange={(event) => updateField("slug", event.target.value)}
                  placeholder="gulshan-sports-hub"
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="venue-address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="venue-address"
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="Area, Karachi"
                  className="h-11 pl-10"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="venue-amenities">Amenities</Label>
              <Input
                id="venue-amenities"
                value={form.amenities}
                onChange={(event) => updateField("amenities", event.target.value)}
                placeholder="parking, changing_rooms, floodlights"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Comma separated. Names are stored lowercase with underscores.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="venue-description">Description</Label>
              <Textarea
                id="venue-description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={4}
                placeholder="Tell customers what makes your venue worth booking."
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="venue-latitude">Latitude</Label>
                <Input
                  id="venue-latitude"
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(event) => updateField("latitude", event.target.value)}
                  placeholder={String(KARACHI_FALLBACK.lat)}
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="venue-longitude">Longitude</Label>
                <Input
                  id="venue-longitude"
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(event) => updateField("longitude", event.target.value)}
                  placeholder={String(KARACHI_FALLBACK.lon)}
                  className="h-11"
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Stored as a PostGIS point so nearby discovery can rank your venue.
              </p>
            </div>

            <div className="grid gap-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label htmlFor="venue-images">Venue photos</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uploads go straight to Cloudinary through the signed upload function.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || uploadMutation.isPending || form.images.length >= MAX_IMAGES}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadMutation.isPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Plus />
                  )}
                  Add photos
                </Button>
                <input
                  ref={fileInputRef}
                  id="venue-images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleFiles}
                />
              </div>
              {uploadError ? (
                <Notice tone="warning" title="Upload problem">
                  {uploadError}
                </Notice>
              ) : null}
              {form.images.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos added yet.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {form.images.map((image, index) => (
                    <li key={image} className="group relative overflow-hidden rounded-lg border">
                      {/* Remote Cloudinary host is allowlisted in next.config.ts. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={`Venue photo ${index + 1}`}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Remove photo ${index + 1}`}
                        onClick={() => removeImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-foreground/80 p-1.5 text-background opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Up to {MAX_IMAGES} photos. Removing a photo here only updates the listing; the
                stored file stays in Cloudinary until a backend deletion contract exists.
              </p>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isPending || disabled}>
              {isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
              {isPending ? "Saving…" : venue ? "Save changes" : "Create venue draft"}
            </Button>
            {uploadMutation.isPending ? (
              <span className="text-sm text-muted-foreground">Uploading photos…</span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
