import type { Metadata } from "next"
import { ProtectedRoute } from "@/components/app/protected-route"
import { BookingConfirmationPage } from "@/components/booking/booking-confirmation-page"

export const metadata: Metadata = {
  title: "Booking confirmation",
}

export default async function BookingConfirmationRoute({
  params,
}: {
  params: Promise<{ bookingRef: string }>
}) {
  const { bookingRef } = await params
  return (
    <ProtectedRoute>
      <BookingConfirmationPage bookingRef={bookingRef} />
    </ProtectedRoute>
  )
}
