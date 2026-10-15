import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { VenueReviewPage } from "@/components/admin/venue-review-page"

export const metadata: Metadata = {
  title: "Venue review",
}

export default function VenueReviewRoute() {
  return <AdminConsole><VenueReviewPage /></AdminConsole>
}
