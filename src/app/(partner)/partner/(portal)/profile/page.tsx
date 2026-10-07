import type { Metadata } from "next"
import { PartnerProfileView } from "@/components/partner/partner-profile-view"

export const metadata: Metadata = { title: "Profile" }

export default function ProfilePage() {
  return <PartnerProfileView />
}
