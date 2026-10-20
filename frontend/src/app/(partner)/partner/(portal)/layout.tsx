import { redirect } from "next/navigation"
import { PartnerShell } from "@/components/partner/partner-shell"
import { getServerViewer, isPartnerRole } from "@/lib/auth-server"

/**
 * Server-side gate for the owner portal.
 *
 * `(portal)` groups every authenticated partner page with `PartnerShell` and
 * keeps `sign-in`, `join`, `apply`, and the partner landing page outside it, so
 * this layout can guard the whole workspace without catching the public pages.
 *
 * The check runs before the shell or any child page is rendered, so a
 * signed-out visitor never sees portal chrome and is sent to sign in with a
 * `next` back to where they were headed. A signed-in customer or admin is sent
 * to their own home instead of being shown a portal they cannot use — their
 * `venue_team`-scoped data would come back empty anyway.
 */
export default async function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const viewer = await getServerViewer()
  if (!viewer) redirect("/partner/sign-in?next=%2Fpartner%2Foverview")
  if (!isPartnerRole(viewer.role)) redirect("/")
  return <PartnerShell>{children}</PartnerShell>
}
