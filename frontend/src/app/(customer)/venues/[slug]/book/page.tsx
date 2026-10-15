import type { Metadata } from "next"
import { BookingFlow } from "@/components/booking/booking-flow"

export const metadata: Metadata = {
  title: "Book a court",
}

export default async function BookVenuePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <BookingFlow slug={slug} />
}
