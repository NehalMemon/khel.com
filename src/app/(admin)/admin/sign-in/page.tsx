import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import { AdminLogo } from "@/components/app/logo"
import { SignInForm } from "@/components/auth/sign-in-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin sign in",
}

function getSafeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /[\u0000-\u001f]/.test(candidate)) return "/admin"
  try {
    const baseUrl = new URL("https://admin.local")
    const parsed = new URL(candidate, baseUrl)
    if (parsed.origin !== baseUrl.origin || parsed.pathname.startsWith("//")) return "/admin"
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return "/admin"
  }
}

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const nextPath = getSafeNextPath(params.next)

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-foreground p-12 text-background lg:flex lg:flex-col lg:justify-between"><AdminLogo /><div className="max-w-xl"><span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><ShieldCheck className="size-7" /></span><h1 className="mt-7 text-5xl font-black tracking-[-0.07em]">Keep every court moving.</h1><p className="mt-5 max-w-lg text-lg leading-8 text-background/60">A private workspace for venue review, booking oversight, and platform operations.</p></div><p className="text-sm text-background/40">Admin and super-admin accounts are provisioned internally. There is no public sign-up.</p></section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><AdminLogo /></div><Card><CardHeader><CardTitle className="text-2xl">Operations sign in</CardTitle><p className="mt-2 text-sm text-muted-foreground">Use your provisioned platform administrator account.</p></CardHeader><CardContent><SignInForm nextPath={nextPath} /></CardContent></Card></div></section>
    </main>
  )
}
