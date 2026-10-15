import type { Metadata } from "next"
import { AuthPageFrame } from "@/components/auth/auth-page-frame"
import { PartnerSignInForm } from "@/components/auth/partner-auth-forms"

export const metadata: Metadata = { title: "Sign in" }

/**
 * Only same-origin, path-absolute targets survive. Anything protocol-relative or
 * absolute would turn the post-login redirect into an open redirect.
 */
export function getSafeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f]/.test(candidate)
  ) {
    return "/partner"
  }
  try {
    const baseUrl = new URL("https://khel.local")
    const url = new URL(candidate, baseUrl)
    if (url.origin !== baseUrl.origin || url.pathname.startsWith("//")) return "/partner"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/partner"
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const { next } = await searchParams
  return (
    <AuthPageFrame
      eyebrow="Welcome back"
      title="Run your venue from one place."
      description="Sign in to manage courts, schedules, photos, and every booking your venue receives."
      footer="New partner? Create a venue owner account in a couple of minutes."
      backLink={{ href: "/partner/join", label: "List your venue" }}
    >
      <PartnerSignInForm nextPath={getSafeNextPath(next)} />
    </AuthPageFrame>
  )
}
