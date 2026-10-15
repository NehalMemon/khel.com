import { SiteFooter } from "@/components/app/site-footer"
import { SiteHeader } from "@/components/app/site-header"
import { BookingSelectionProvider } from "@/components/booking/booking-selection-provider"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookingSelectionProvider>
      <SiteHeader />
      <div className="min-h-[calc(100vh-8.5rem)]">{children}</div>
      <SiteFooter />
    </BookingSelectionProvider>
  )
}
