import type { Metadata } from "next"
import { ProtectedRoute } from "@/components/app/protected-route"
import { BookingsPage } from "@/components/booking/bookings-page"

export const metadata: Metadata = {
  title: "My bookings",
}

export default function BookingsRoute() {
  return (
    <ProtectedRoute>
      <BookingsPage />
    </ProtectedRoute>
  )
}
