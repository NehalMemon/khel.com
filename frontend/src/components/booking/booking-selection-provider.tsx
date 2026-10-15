"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

/**
 * The court and date a customer is booking, shared between the venue page and
 * the booking page.
 *
 * These used to travel in the URL (`?courtId=…&date=…`), which leaked UI state
 * into links, broke shareability (someone else's court id would silently apply),
 * and made the sign-in round trip fragile. They live here instead so the choice
 * survives venue page → `/venues/[slug]/book` → sign-in → back, and a hard
 * refresh simply falls back to the sensible defaults the booking page derives.
 */
export type BookingSelection = {
  slug: string
  courtId: string
  date: string
}

type BookingSelectionContextValue = {
  selection: BookingSelection | null
  setSelection: (next: BookingSelection) => void
  reset: () => void
}

const BookingSelectionContext = createContext<BookingSelectionContextValue | null>(null)

export function BookingSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<BookingSelection | null>(null)

  const setSelection = useCallback((next: BookingSelection) => {
    setSelectionState(next)
  }, [])

  const reset = useCallback(() => {
    setSelectionState(null)
  }, [])

  const value = useMemo(
    () => ({ selection, setSelection, reset }),
    [selection, setSelection, reset],
  )

  return (
    <BookingSelectionContext.Provider value={value}>{children}</BookingSelectionContext.Provider>
  )
}

export function useBookingSelection(): BookingSelectionContextValue {
  const context = useContext(BookingSelectionContext)
  if (!context) {
    throw new Error("useBookingSelection must be used within a BookingSelectionProvider")
  }
  return context
}
