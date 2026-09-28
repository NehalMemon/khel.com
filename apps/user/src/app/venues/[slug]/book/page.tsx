import type { Metadata } from "next"
import { BookingFlow } from "@/components/booking/booking-flow"

export const metadata: Metadata = {
  title: "Book a court",
}

export default async function BookVenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ courtId?: string | string[] }>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const courtId = typeof query.courtId === "string" ? query.courtId : undefined
  return <BookingFlow slug={slug} initialCourtId={courtId} />
}
