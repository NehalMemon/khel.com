import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { AdminBookingsPage } from "@/components/admin/admin-bookings-page"

export const metadata: Metadata = {
  title: "Bookings oversight",
}

export default function AdminBookingsRoute() {
  return <AdminConsole><AdminBookingsPage /></AdminConsole>
}
