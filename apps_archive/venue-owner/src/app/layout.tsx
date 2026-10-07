import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth/auth-provider"
import { QueryProvider } from "@/components/app/query-provider"
import { APP_NAME } from "@/lib/utils"

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} Partner Portal`,
    template: `%s - ${APP_NAME} Partner Portal`,
  },
  description: "Manage your Khel.com sports venues, courts, schedules and bookings.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#0b1220",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
