import type { Metadata } from "next"
import { PartnerBookingsPage } from "@/components/partner/partner-bookings-page"

export const metadata: Metadata = { title: "Bookings" }

export default function BookingsPage() {
  return <PartnerBookingsPage />
}
