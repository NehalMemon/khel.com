/**
 * `@sfpy/checkout-components` (v1.0.1) ships no type declarations. This file
 * declares only the surface this app uses:
 *
 *  - `Checkout` — the zoid popup that consumes the **server-issued** session
 *    tokens (`tracker` + `tbt`) produced by the `initiate-checkout` Edge
 *    Function. `metadata.booking_id` is attached server-side when the tracker
 *    is created, because the browser SDK has no prop for it.
 *  - `Button` — the hosted Safepay button, kept for completeness; the app
 *    launches `Checkout` directly.
 *
 * The package is a UMD build (`module.exports = factory()`), so a default
 * import resolves to the `safepay` global object.
 */
declare module "@sfpy/checkout-components" {
  type SafepayEnvironment = "local" | "development" | "sandbox" | "production"

  type CheckoutProps = {
    /** Server-issued Safepay tracker token (`initiate-checkout` response). */
    tracker: string
    /** Server-issued passport time-based token (`initiate-checkout` response). */
    tbt: string
    env: SafepayEnvironment
    /** Called once the buyer approves the payment; the popup closes itself. */
    onSuccess?: (data?: unknown) => void
    /** Called when the buyer closes or abandons the popup. */
    onCancel?: (data?: unknown) => void
  }

  type SafepayInstance = {
    render(container: Element | string): void
    renderTo(targetWindow: Window, container: Element | string): void
    close(): void
  }

  type SafepayCheckoutComponent = (props: CheckoutProps) => SafepayInstance

  type SafepayButtonProps = {
    env: SafepayEnvironment
    client: Record<string, string>
    style?: { mode?: "light" | "dark"; size?: "small" | "medium" | "large"; variant?: "primary" | "dark" }
    orderId?: string
    source?: string
    payment?: { currency: string; amount: number }
    onPayment?: (data: unknown) => unknown
    onCancel?: () => void
  }

  type SafepayApi = {
    Checkout: SafepayCheckoutComponent
    Button: (props: SafepayButtonProps) => SafepayInstance
  }

  const safepay: SafepayApi
  export default safepay
}
