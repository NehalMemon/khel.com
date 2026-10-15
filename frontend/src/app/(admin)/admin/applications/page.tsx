import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { AdminApplicationsPage } from "@/components/admin/admin-applications-page"

export const metadata: Metadata = {
  title: "Venue applications",
}

export default function AdminApplicationsRoute() {
  return (
    <AdminConsole>
      <AdminApplicationsPage />
    </AdminConsole>
  )
}
