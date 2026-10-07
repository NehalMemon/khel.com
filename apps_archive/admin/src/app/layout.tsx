import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { AuthProvider } from "@/components/auth/auth-provider"
import { QueryProvider } from "@/components/app/query-provider"
import { APP_NAME, APP_TAGLINE } from "@/lib/utils"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} Operations — ${APP_TAGLINE}`,
    template: `%s — ${APP_NAME} Operations`,
  },
  description: "Private operations console for khel.com venue partners and platform administrators.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
