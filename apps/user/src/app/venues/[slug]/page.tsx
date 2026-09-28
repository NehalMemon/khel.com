import type { Metadata } from "next"
import { VenueDetailPage } from "@/components/booking/venue-detail-page"

export const metadata: Metadata = {
  title: "Venue details",
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <VenueDetailPage slug={slug} />
}
