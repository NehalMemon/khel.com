import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"

/**
 * Checkout orchestration seam.
 *
 * The browser never creates a booking, a price, or a Safepay session on its
 * own. `initiate-checkout` (Supabase Edge Function) does all of it in one
 * server-side step:
 *
 *   1. verifies the held slot and computes the amount + commission,
 *   2. inserts (or reuses) the pending `bookings` row,
 *   3. creates the Safepay tracker with `metadata.booking_id` attached so the
 *      webhook can identify the transaction, and
 *   4. returns `{ booking_id, booking_ref, amount, tracker, tbt }`.
 *
 * The client's only jobs are to pass the returned `tracker`/`tbt` to the
 * Safepay widget (`@sfpy/checkout-components`) and to watch
 * `bookings.payment_status` on the confirmation page — the gateway webhook is
 * the only writer that finalizes the ledger.
 */

export type PendingBooking = {
  bookingId: string
  bookingRef: string
  /** PKR, computed server-side. Display only; never trusted for charging. */
  amount: number
  /** Safepay tracker token; feed this to the widget's `Checkout` component. */
  tracker: string
  /** Safepay passport time-based token; required by the widget alongside it. */
  tbt: string
}

type InitiateCheckoutResponse = {
  success?: boolean
  booking_id?: string
  booking_ref?: string
  amount?: number
  tracker?: string
  tbt?: string
  error?: string
}

export class CheckoutNotConfiguredError extends Error {
  constructor(message = "Supabase is not connected, so checkout cannot start.") {
    super(message)
    this.name = "CheckoutNotConfiguredError"
  }
}

/**
 * Calls `initiate-checkout` for a held slot and returns the server-issued
 * booking identifiers plus the Safepay session tokens. Throws the Edge
 * Function's error message (slot no longer held, venue not configured, …)
 * so the UI can show it verbatim.
 */
export async function createPendingBooking(slotId: string): Promise<PendingBooking> {
  if (!isSupabaseConfigured()) throw new CheckoutNotConfiguredError()
  const { data, error } = await getSupabaseBrowserClient().functions.invoke(
    "initiate-checkout",
    { body: { slot_id: slotId } },
  )
  if (error) throw new Error(error.message || "Could not start checkout.")
  const payload = (data ?? {}) as InitiateCheckoutResponse
  if (payload.error) throw new Error(payload.error)
  if (!payload.booking_id) {
    throw new Error("The checkout session could not be created. Please try again.")
  }
  return {
    bookingId: payload.booking_id,
    bookingRef: payload.booking_ref ?? "",
    amount: Number(payload.amount ?? 0),
    tracker: payload.tracker ?? "",
    tbt: payload.tbt ?? "",
  }
}
