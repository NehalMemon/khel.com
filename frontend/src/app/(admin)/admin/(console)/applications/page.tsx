import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { ApplicationsPage } from "@/components/admin/applications-page"

export const metadata: Metadata = {
  title: "Venue Applications",
}

export default function AdminApplicationsRoute() {
  return (
    <AdminConsole>
      <ApplicationsPage />
    </AdminConsole>
  )
}
