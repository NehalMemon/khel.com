import { SiteFooter } from "@/components/app/site-footer"
import { SiteHeader } from "@/components/app/site-header"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="min-h-[calc(100vh-8.5rem)]">{children}</div>
      <SiteFooter />
    </>
  )
}
