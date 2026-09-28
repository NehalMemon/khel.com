import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const metadata: Metadata = {
  title: "Overview",
}

export default function AdminHomePage() {
  return <AdminConsole><AdminDashboard /></AdminConsole>
}
