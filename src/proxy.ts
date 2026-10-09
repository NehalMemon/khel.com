import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"

/**
 * Single route guard for the whole app (Next 16's `proxy.ts` is the renamed
 * `middleware.ts`). It protects the three namespaces declared in
 * `doc/FRONTEND_STRATEGY.md`:
 *
 *  - `/(customer)` — public marketplace; `/bookings` and `/profile` need a session.
 *  - `/(partner)`  — `/partner/**` requires `role = venue_owner`.
 *  - `/(admin)`    — `/admin/**` requires `role in ('admin', 'super_admin')`.
 *
 * RLS in the database remains the real authorization boundary; this is a UX
 * gate plus the first line of defence announced by the strategy doc.
 */
const CUSTOMER_SIGN_IN = "/auth/sign-in"
const PARTNER_SIGN_IN = "/partner/sign-in"
const PARTNER_JOIN = "/partner/join"
const ADMIN_SIGN_IN = "/admin/sign-in"

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  return target
}

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ""
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return copyCookies(response, NextResponse.redirect(url))
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let response = NextResponse.next({ request })

  const needsPartnerGuard =
    pathname.startsWith("/partner") &&
    pathname !== PARTNER_JOIN &&
    pathname !== PARTNER_SIGN_IN &&
    !pathname.startsWith(`${PARTNER_SIGN_IN}/`)
  const needsAdminGuard =
    pathname.startsWith("/admin") &&
    pathname !== ADMIN_SIGN_IN &&
    !pathname.startsWith(`${ADMIN_SIGN_IN}/`)
  const needsSessionOnly = isCustomerProtected(pathname)

  // Unconfigured Supabase (no env): guarded areas bounce to their sign-in page,
  // which shows the "configure Supabase" notice instead of a broken form.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (needsAdminGuard) return redirectWithCookies(request, response, ADMIN_SIGN_IN)
    if (needsPartnerGuard) return redirectWithCookies(request, response, PARTNER_SIGN_IN)
    if (needsSessionOnly) return redirectWithCookies(request, response, CUSTOMER_SIGN_IN)
    return response
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  if (!needsPartnerGuard && !needsAdminGuard && !needsSessionOnly) {
    return response
  }

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      if (needsAdminGuard) return redirectWithCookies(request, response, ADMIN_SIGN_IN)
      if (needsPartnerGuard) return redirectWithCookies(request, response, PARTNER_SIGN_IN)
      return redirectWithCookies(request, response, CUSTOMER_SIGN_IN)
    }

    if (needsPartnerGuard || needsAdminGuard) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle()
      const role = profileError ? null : profile?.role ?? null

      // `venue_staff` is intentionally not accepted: the enum value exists but
      // no RLS policy grants it tenant access yet.
      if (needsPartnerGuard && role !== "venue_owner") {
        return copyCookies(response, NextResponse.redirect(new URL(PARTNER_SIGN_IN, request.url)))
      }
      if (needsAdminGuard && role !== "admin" && role !== "super_admin") {
        return copyCookies(response, NextResponse.redirect(new URL(ADMIN_SIGN_IN, request.url)))
      }
    }
  } catch {
    if (needsAdminGuard) return redirectWithCookies(request, response, ADMIN_SIGN_IN)
    if (needsPartnerGuard) return redirectWithCookies(request, response, PARTNER_SIGN_IN)
    return redirectWithCookies(request, response, CUSTOMER_SIGN_IN)
  }

  return response
}

function isCustomerProtected(pathname: string): boolean {
  return (
    pathname === "/bookings" ||
    pathname.startsWith("/bookings/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  )
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
}
