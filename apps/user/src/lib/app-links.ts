/**
 * Cross-app navigation targets. The partner portal and admin console are
 * separate Next.js deployments, so they are configured per environment rather
 * than linked by an in-app route.
 */
function cleanBase(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim().replace(/\/+$/, "")
  if (!trimmed) return fallback
  // Only accept absolute http(s) URLs so a misconfigured value cannot become a
  // javascript: or protocol-relative link.
  if (!/^https?:\/\//i.test(trimmed)) return fallback
  return trimmed
}

export const PARTNER_APP_URL = cleanBase(
  process.env.NEXT_PUBLIC_PARTNER_APP_URL,
  "http://localhost:3001",
)

export const ADMIN_APP_URL = cleanBase(
  process.env.NEXT_PUBLIC_ADMIN_APP_URL,
  "http://localhost:3002",
)
