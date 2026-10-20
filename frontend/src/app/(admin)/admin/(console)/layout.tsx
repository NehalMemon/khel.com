import { redirect } from "next/navigation"
import { getServerViewer, isAdminRole } from "@/lib/auth-server"

/**
 * Server-side gate for the admin console (`/admin` and everything under it,
 * except `/admin/sign-in`).
 *
 * This route group exists precisely to separate the sign-in page from the
 * protected console: a layout applies to every child segment, so a guard placed
 * on `/admin` itself would redirect before the sign-in form could ever render.
 *
 * The client-side `AdminRoute` still renders a friendly "access required" card
 * for role changes that happen after hydration; this layout is the
 * authoritative check and runs before any console page is rendered or streamed.
 */
export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const viewer = await getServerViewer()
  if (!viewer) redirect("/admin/sign-in?next=%2Fadmin")
  if (!isAdminRole(viewer.role)) redirect("/")
  return children
}
