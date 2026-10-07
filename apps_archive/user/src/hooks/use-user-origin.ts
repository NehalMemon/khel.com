"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { KARACHI_FALLBACK } from "@/lib/utils"

export type UserOrigin = {
  lat: number
  lon: number
  /** `true` when the browser declined or failed, so the UI can explain itself. */
  isFallback: boolean
}

export type UseUserOriginResult = {
  origin: UserOrigin | null
  isLocating: boolean
  error: string | null
  requestLocation: () => void
}

/**
 * `doc/HANDOFF.md` ("Spatial Venue Discovery") requires a geolocation prompt with
 * a documented fallback: if the user declines, discovery falls back to central
 * Karachi instead of failing. The fallback is surfaced as `isFallback` so the
 * UI can tell the user why results are not nearby.
 */
export function useUserOrigin(): UseUserOriginResult {
  const [origin, setOrigin] = useState<UserOrigin | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requested = useRef(false)

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setOrigin({ ...KARACHI_FALLBACK, isFallback: true })
      setError("Location is not available in this browser, so we searched central Karachi.")
      return
    }
    setIsLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          isFallback: false,
        })
        setIsLocating(false)
      },
      () => {
        setOrigin({ ...KARACHI_FALLBACK, isFallback: true })
        setError("We could not use your location, so we searched central Karachi instead.")
        setIsLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  useEffect(() => {
    if (requested.current) return
    requested.current = true
    requestLocation()
  }, [requestLocation])

  return { origin, isLocating, error, requestLocation }
}
