/**
 * Checkout seam.
 *
 * The Safepay checkout cannot be started from the browser alone. The official
 * SDK (`@sfpy/checkout-components`, v1.0.1) launches its `Checkout` zoid
 * component with **server-created session tokens** (`tracker` and `tbt`), and
 * its only working examples pass a merchant **secret** key (`sec_...`) from the
 * client. Neither is safe to ship in the frontend, and the SDK exposes no
 * `metadata` prop — so the `booking_id` the webhook depends on has to be
 * attached when the session is created server-side.
 *
 * `createPendingBooking` is the single seam the frontend depends on. Nehal must
 * implement it as an Edge Function (or RPC) that, in one server-side step:
 *   1. inserts a `pending` booking for `slotId` (the server computes the amount;
 *      the browser must never decide price, commission or availability),
 *   2. creates the Safepay payment session with `metadata.booking_id = <id>`,
 *   3. returns `{ bookingId, bookingRef, amount }` (and, once the widget is
 *      wired, the session tokens `{ tracker, tbt }`).
 *
 * Until that ships, every call throws `PaymentBackendNotReadyError` and the UI
 * keeps showing the "payment connection pending" state.
 */

/** Raised while the payment backend has not been implemented yet. */
export class PaymentBackendNotReadyError extends Error {
  constructor(message = "The payment backend is not ready yet.") {
    super(message)
    this.name = "PaymentBackendNotReadyError"
  }
}

export type PendingBooking = {
  bookingId: string
  bookingRef: string
  amount: number
}

/**
 * Creates a pending booking for `slotId` and returns the server-issued
 * identifiers and amount.
 *
 * TODO(payments): replace the body with a call to the payment Edge Function.
 * The `amount` handed to the gateway must come from that server response —
 * never from a component.
 */
export async function createPendingBooking(slotId: string): Promise<PendingBooking> {
  // Referenced so the parameter stays meaningful once the backend lands.
  void slotId
  throw new PaymentBackendNotReadyError(
    "The payment backend is not connected yet: no server endpoint can create a pending booking or a Safepay session.",
  )
}
