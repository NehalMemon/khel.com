import type { Metadata } from "next"
import { PartnerCourtsPage } from "@/components/partner/partner-courts-page"

export const metadata: Metadata = { title: "Courts" }

export default function CourtsPage() {
  return <PartnerCourtsPage />
}
