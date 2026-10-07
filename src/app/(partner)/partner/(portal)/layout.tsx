import { PartnerShell } from "@/components/partner/partner-shell"

export default function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>
}
