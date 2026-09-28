import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { VenuesPage } from "@/components/admin/venues-page"

export const metadata: Metadata = {
  title: "All venues",
}

export default function AdminVenuesRoute() {
  return (
    <AdminConsole>
      <VenuesPage />
    </AdminConsole>
  )
}
