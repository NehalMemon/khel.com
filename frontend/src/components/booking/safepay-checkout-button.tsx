"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { CreditCard, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/app/notice"
import { createPendingBooking, type PendingBooking } from "@/lib/queries/checkout"
import { formatCurrency } from "@/lib/utils"

const SAFEPAY_ENV_RAW = process.env.NEXT_PUBLIC_SAFEPAY_ENV ?? "sandbox"

/** The widget only understands the environments it has a domain map for. */
const SAFEPAY_ENV: "local" | "development" | "sandbox" | "production" =
  SAFEPAY_ENV_RAW === "production"
    ? "production"
    : SAFEPAY_ENV_RAW === "development"
      ? "development"
      : SAFEPAY_ENV_RAW === "local"
        ? "local"
        : "sandbox"

/**
 * Which stage the launcher is at.
 *
 * `launching`   — the `initiate-checkout` Edge Function is creating the
 *                 pending booking + Safepay tracker.
 * `awaiting-payment` — the Safepay popup is open; the buyer may still cancel.
 * `cancelled`   — the buyer closed the popup; the hold is still live, so the
 *                 button can be pressed again.
 */
type CheckoutStatus = "idle" | "launching" | "awaiting-payment" | "cancelled" | "error"

/**
 * Starts the Safepay checkout for a held slot.
 *
 * Flow: invoke `initiate-checkout` → receive `{ booking_id, booking_ref,
 * tracker, tbt }` → launch the Safepay `Checkout` widget with the server
 * tokens. `metadata.booking_id` was attached to the tracker server-side, which
 * is what lets the webhook settle the right ledger row. On success the buyer
 * lands on the confirmation page, which watches `payment_status`.
 */
export function SafepayCheckoutButton({
  slotId,
  holdExpired = false,
  amount,
}: {
  slotId: string | null
  holdExpired?: boolean
  /** Optional display price while the server recomputes it on checkout. */
  amount?: number | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<CheckoutStatus>("idle")
  const [message, setMessage] = useState<string | null>(null)

  async function startCheckout() {
    // Double-click guard: a second click while launching is ignored.
    if (status === "launching" || status === "awaiting-payment" || !slotId || holdExpired) return
    setStatus("launching")
    setMessage(null)
    try {
      const pending: PendingBooking = await createPendingBooking(slotId)

      if (!pending.tracker || !pending.tbt) {
        setStatus("error")
        setMessage(
          "The payment gateway is not configured on the server yet (missing Safepay keys). Your slot is still held.",
        )
        return
      }

      // The SDK is heavy and browser-only, so it is loaded on demand instead
      // of being bundled into the initial page load.
      const loaded = await import("@sfpy/checkout-components")
      const safepay = (loaded.default ?? loaded) as typeof import("@sfpy/checkout-components").default

      setStatus("awaiting-payment")
      safepay
        .Checkout({
          tracker: pending.tracker,
          tbt: pending.tbt,
          env: SAFEPAY_ENV,
          onSuccess: () => {
            // The webhook finalizes the ledger; the confirmation page polls
            // `payment_status` and shows the outcome.
            void queryClient.invalidateQueries({ queryKey: ["slots"] })
            void queryClient.invalidateQueries({ queryKey: ["bookings"] })
            if (pending.bookingRef) {
              router.push(`/bookings/confirmation/${encodeURIComponent(pending.bookingRef)}`)
            }
          },
          onCancel: () => {
            setStatus("cancelled")
          },
        })
        .renderTo(window, "body")
    } catch (caught) {
      setStatus("error")
      setMessage(caught instanceof Error ? caught.message : "Could not start checkout.")
    }
  }

  return (
    <div className="grid gap-3">
      {holdExpired ? (
        <Notice tone="warning" title="Your hold expired">
          Pick the slot again to restart the countdown before paying.
        </Notice>
      ) : null}
      {status === "cancelled" ? (
        <Notice tone="info" title="Checkout closed">
          You closed the payment window. Your slot is still held — reopen the
          checkout whenever you are ready.
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
        disabled={
          !slotId ||
          holdExpired ||
          status === "launching" ||
          status === "awaiting-payment"
        }
      >
        {status === "launching" || status === "awaiting-payment" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <CreditCard />
        )}
        {holdExpired
          ? "Hold expired"
          : status === "launching"
            ? "Starting checkout…"
            : status === "awaiting-payment"
              ? "Waiting for payment…"
              : amount && amount > 0
                ? `Pay ${formatCurrency(amount)}`
                : "Pay and confirm"}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        {SAFEPAY_ENV === "production"
          ? "Secure Safepay checkout"
          : `Secure Safepay checkout (${SAFEPAY_ENV})`}
      </p>
    </div>
  )
}
