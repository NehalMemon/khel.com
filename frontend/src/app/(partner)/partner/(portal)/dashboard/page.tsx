import type { Metadata } from "next"
import { PartnerTimelinePage } from "@/components/partner/partner-timeline-page"

export const metadata: Metadata = { title: "Timeline POS" }

export default function TimelinePage() {
  return <PartnerTimelinePage />
}
