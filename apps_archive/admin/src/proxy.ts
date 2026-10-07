import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  return target
}

function getSignInRedirect(request: NextRequest, response: NextResponse): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = "/sign-in"
  url.search = ""
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return copyCookies(response, NextResponse.redirect(url))
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return getSignInRedirect(request, NextResponse.next())

  let response = NextResponse.next({ request })
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return getSignInRedirect(request, response)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle()
    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return getSignInRedirect(request, response)
    }
  } catch {
    return getSignInRedirect(request, response)
  }

  return response
}

export const config = {
  matcher: ["/((?!sign-in|_next|favicon.ico).*)"],
}
