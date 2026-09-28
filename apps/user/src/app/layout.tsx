import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth/auth-provider"
import { QueryProvider } from "@/components/app/query-provider"
import { SiteFooter } from "@/components/app/site-footer"
import { SiteHeader } from "@/components/app/site-header"
import { APP_NAME, APP_TAGLINE } from "@/lib/utils"

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s — ${APP_NAME}`,
  },
  description: "Discover and book indoor sports venues across Karachi.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <QueryProvider>
          <AuthProvider>
            <SiteHeader />
            <div className="min-h-[calc(100vh-8.5rem)]">{children}</div>
            <SiteFooter />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
