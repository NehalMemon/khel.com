import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { PlatformConfigPage } from "@/components/admin/platform-config-page"

export const metadata: Metadata = {
  title: "Platform config",
}

export default function PlatformConfigRoute() {
  return <AdminConsole><PlatformConfigPage /></AdminConsole>
}
