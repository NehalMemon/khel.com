import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { CourtsPage } from "@/components/admin/courts-page"

export const metadata: Metadata = {
  title: "Courts",
}

export default function AdminCourtsRoute() {
  return (
    <AdminConsole>
      <CourtsPage />
    </AdminConsole>
  )
}
