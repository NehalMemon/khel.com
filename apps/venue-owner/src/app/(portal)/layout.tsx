import { PartnerShell } from "@/components/partner/partner-shell"

export default function PortalLayout({ children }: LayoutProps<"/">) {
  return <PartnerShell>{children}</PartnerShell>
}
