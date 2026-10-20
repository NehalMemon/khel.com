import type { Metadata } from "next"
import { PartnerResourcesPage } from "@/components/partner/partner-resources-page"

export const metadata: Metadata = { title: "Resources" }

export default function ResourcesPage() {
  return <PartnerResourcesPage />
}
