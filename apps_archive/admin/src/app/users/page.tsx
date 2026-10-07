import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { UsersPage } from "@/components/admin/users-page"

export const metadata: Metadata = {
  title: "Users",
}

export default function AdminUsersRoute() {
  return (
    <AdminConsole>
      <UsersPage />
    </AdminConsole>
  )
}
