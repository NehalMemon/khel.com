import { cn } from "cn"
import type { Json } from "@/lib/database.types"

export { cn }

export const APP_NAME = "khel.com"
export const APP_TAGLINE = "Find your court. Own your game."

/**
 * Documented geolocation fallback from `doc/HANDOFF.md` ("Spatial Venue
 * Discovery"): when the user denies the geolocation prompt we fall back to
 * central Karachi so discovery still works. This is a documented UI default,
 * not business data.
 */
export const KARACHI_FALLBACK = { lat: 24.8607, lon: 67.0011 } as const

/** Copy required by `doc/HANDOFF.md` for the `hold_slot` conflict path. */
export const SLOT_TAKEN_MESSAGE =
  "This slot was just taken by another customer. Please choose another available time."

/**
 * Sentinel returned by `getHoldSlotErrorMessage` for the `freemium_limit_reached`
 * exception. Components compare against it to open the upgrade sheet instead of
 * showing a raw database message.
 */
export const FREEMIUM_LIMIT_REACHED = "freemium_limit_reached"

export function formatCurrency(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`))
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatTime(value: string): string {
  return value.slice(0, 5)
}

/** Pakistan Standard Time. Slot times are stored as naive local times. */
const PAKISTAN_UTC_OFFSET = "+05:00"

export function isSlotInFuture(date: string, startTime: string, now = Date.now()): boolean {
  const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime
  const slotTime = Date.parse(`${date}T${normalizedTime}${PAKISTAN_UTC_OFFSET}`)
  return Number.isFinite(slotTime) && slotTime > now
}

export function getDateInputValue(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Pakistani mobile formats accepted by the signup/profile contract. */
export const PHONE_PATTERN = /^((\+92)|(0092)|(0))?3[0-9]{9}$/

/** Normalize a local/prefixed Pakistani number to E.164, or null if invalid. */
export function normalizePhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "")
  if (!PHONE_PATTERN.test(compact)) {
    return null
  }
  if (compact.startsWith("+92")) return `+92${compact.slice(3)}`
  if (compact.startsWith("0092")) return `+92${compact.slice(4)}`
  if (compact.startsWith("0")) return `+92${compact.slice(1)}`
  return `+92${compact}`
}

/** Backend provisions `pending-<user-id>` when signup carried no phone number. */
export function isPendingPhone(phone: string | null | undefined): boolean {
  return typeof phone === "string" && phone.startsWith("pending-")
}

/** Friendly display form for a stored E.164 number. */
export function formatPhone(value: string | null | undefined): string {
  if (!value || isPendingPhone(value)) return ""
  if (value.startsWith("+92") && value.length === 13) {
    return `0${value.slice(3, 5)} ${value.slice(5, 8)} ${value.slice(8)}`
  }
  return value
}

/**
 * `venues.amenities` is a jsonb bag that also stores the venue image list
 * (`amenities->'images'`, which is what `search_venues_nearby` projects back).
 * There is no `media` table, so this is the only image source today.
 */
export function readVenueImages(amenities: unknown): string[] {
  if (!amenities || typeof amenities !== "object" || Array.isArray(amenities)) return []
  const images = (amenities as Record<string, unknown>).images
  if (!Array.isArray(images)) return []
  return images.filter((item): item is string => typeof item === "string" && item.length > 0)
}

/** Merges the boolean amenity flags with the image list so neither is lost. */
export function withVenueImages(amenities: unknown, images: string[]): Json {
  const base =
    amenities && typeof amenities === "object" && !Array.isArray(amenities)
      ? { ...(amenities as Record<string, unknown>) }
      : {}
  if (images.length > 0) {
    base.images = images
  } else {
    delete base.images
  }
  return base as Json
}

/** Turn a venue/court name into a URL slug fragment. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message
    if (typeof message === "string") return message
  }
  return "Something went wrong. Please try again."
}

/** Human-readable message for the `hold_slot` RPC's three known exceptions. */
export function getHoldSlotErrorMessage(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes("not authenticated")) {
    return "Please sign in before holding a slot."
  }
  if (normalized.includes("freemium_limit_reached")) {
    return FREEMIUM_LIMIT_REACHED
  }
  if (normalized.includes("slot is not available")) {
    return SLOT_TAKEN_MESSAGE
  }
  return message
}

export function getAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase()
  if (
    (normalized.includes("phone") && normalized.includes("already")) ||
    (normalized.includes("duplicate") && normalized.includes("phone")) ||
    normalized.includes("phone_auth_hook")
  ) {
    return "This phone number is already linked to an account."
  }
  if (normalized.includes("email") && normalized.includes("already")) {
    return "An account with this email already exists."
  }
  if (normalized.includes("invalid login")) {
    return "The email or password is incorrect."
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email address before signing in."
  }
  return message
}

export function getPasswordStrength(password: string): {
  label: string
  percentage: number
} {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  const labels = ["Too short", "Needs work", "Good", "Strong", "Excellent"]
  return {
    label: labels[score],
    percentage: Math.max(score * 25, password.length ? 10 : 0),
  }
}

export const MIN_PASSWORD_LENGTH = 8
