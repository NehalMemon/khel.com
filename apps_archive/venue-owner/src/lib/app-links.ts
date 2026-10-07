/**
 * The customer app is a separate deployment, so the venue preview link is
 * configured per environment rather than resolved through an in-app route.
 *
 * Validation mirrors `apps/user/src/lib/app-links.ts` so a misconfigured value
 * can never become a `javascript:` or protocol-relative href.
 *
 * There is deliberately no localhost fallback here. When the variable is
 * missing the preview link is hidden rather than rendered as a broken link in a
 * deployed environment.
 */
function readExternalBase(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, "")
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) return null
  return trimmed
}

export const USER_APP_URL = readExternalBase(process.env.NEXT_PUBLIC_USER_APP_URL)

/** Read-only preview of a published venue on the customer site. */
export function userVenuePreviewUrl(slug: string): string | null {
  if (!USER_APP_URL) return null
  const safeSlug = slug.trim()
  if (!safeSlug) return null
  return `${USER_APP_URL}/venues/${encodeURIComponent(safeSlug)}`
}
