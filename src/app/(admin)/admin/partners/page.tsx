import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { PartnersPage } from "@/components/admin/partners-page"

export const metadata: Metadata = {
  title: "Venue owners",
}

export default function AdminPartnersRoute() {
  return (
    <AdminConsole>
      <PartnersPage />
    </AdminConsole>
  )
}
