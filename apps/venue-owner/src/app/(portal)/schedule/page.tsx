import type { Metadata } from "next"
import { PartnerSchedulePage } from "@/components/partner/partner-schedule-page"

export const metadata: Metadata = { title: "Schedule" }

export default function SchedulePage() {
  return <PartnerSchedulePage />
}
