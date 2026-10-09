import type { Metadata } from "next"
import { AuthPageFrame } from "@/components/auth/auth-page-frame"
import { CustomerSignInForm } from "@/components/auth/auth-forms"

export const metadata: Metadata = {
  title: "Sign in",
}

function getSafeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /[\u0000-\u001f]/.test(candidate)) return "/"
  try {
    const baseUrl = new URL("https://khel.local")
    const url = new URL(candidate, baseUrl)
    if (url.origin !== baseUrl.origin || url.pathname.startsWith("//")) return "/"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/"
  }
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams
  return (
    <AuthPageFrame
      eyebrow="Welcome back"
      title="Step back onto the court."
      description="Sign in to book a venue, manage your bookings, or pick up where you left off."
      footer="New here? Create a customer account in seconds."
      backLink={{ href: "/", label: "Back to discover" }}
    >
      <CustomerSignInForm nextPath={getSafeNextPath(next)} />
    </AuthPageFrame>
  )
}
