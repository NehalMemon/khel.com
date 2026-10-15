"use client"

import { useState } from "react"
import { CreditCard, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/app/notice"
import { createPendingBooking, PaymentBackendNotReadyError } from "@/lib/queries/checkout"

const SAFEPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY ?? ""
const SAFEPAY_ENV = process.env.NEXT_PUBLIC_SAFEPAY_ENV ?? "sandbox"

/**
 * Which stage the launcher is at. `backend-not-ready` is the only non-idle
 * outcome today because `createPendingBooking` is not implemented yet. Once the
 * backend lands, the widget-only states (`sdk-error` for a failed SDK load and
 * `cancelled` for a buyer who closes the Safepay overlay) are handled in the
 * same place — they never put a secret key in the browser.
 */
type CheckoutStatus = "idle" | "launching" | "backend-not-ready" | "error"

/**
 * Starts the Safepay checkout for a held slot.
 *
 * The browser only ever receives `NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY`; the amount
 * and the Safepay session tokens (`tracker`/`tbt`) must come from
 * `createPendingBooking`, which is server-issued. See `@/lib/queries/checkout`
 * for the contract.
 */
export function SafepayCheckoutButton({
  slotId,
  holdExpired = false,
}: {
  slotId: string | null
  holdExpired?: boolean
}) {
  const [status, setStatus] = useState<CheckoutStatus>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const configured = SAFEPAY_PUBLIC_KEY.length > 0

  async function startCheckout() {
    // Double-click guard: a second click while launching is ignored.
    if (status === "launching" || !slotId || holdExpired) return
    setStatus("launching")
    setMessage(null)
    try {
      await createPendingBooking(slotId)
      // Unreachable until the backend ships. When it does, launch the Safepay
      // Checkout widget here with the server-issued `tracker`/`tbt` and the
      // `metadata.booking_id`, then handle `onSuccess`/`onCancel`/SDK failures.
    } catch (caught) {
      if (caught instanceof PaymentBackendNotReadyError) {
        setStatus("backend-not-ready")
        return
      }
      setStatus("error")
      setMessage(caught instanceof Error ? caught.message : "Could not start checkout.")
    }
  }

  if (!configured) {
    return (
      <Notice tone="info" title="Checkout unavailable">
        Online payment is not configured for this environment. Ask the team for
        the Safepay sandbox public key.
      </Notice>
    )
  }

  return (
    <div className="grid gap-3">
      {holdExpired ? (
        <Notice tone="warning" title="Your hold expired">
          Pick the slot again to restart the countdown before paying.
        </Notice>
      ) : null}
      {status === "backend-not-ready" ? (
        <Notice tone="warning" title="Payment connection pending">
          The payment gateway is not connected yet. The checkout is intentionally
          paused until the backend payment Edge Function and webhook contract are
          shipped.
        </Notice>
      ) : null}
      {status === "error" && message ? (
        <Notice tone="error" title="Could not start checkout">
          {message}
        </Notice>
      ) : null}
      <Button
        size="lg"
        className="w-full"
        onClick={startCheckout}
        disabled={!slotId || holdExpired || status === "launching"}
      >
        {status === "launching" ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {holdExpired
          ? "Hold expired"
          : status === "launching"
            ? "Starting checkout…"
            : "Pay and confirm"}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        {SAFEPAY_ENV === "production" ? "Secure Safepay checkout" : `Secure Safepay checkout (${SAFEPAY_ENV})`}
      </p>
    </div>
  )
}
