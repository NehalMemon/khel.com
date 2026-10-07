"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { Logo } from "@/components/app/logo"
import { PARTNER_APP_URL } from "@/lib/app-links"

const links = [
  { href: "/", label: "Discover" },
  { href: "/bookings", label: "My bookings" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/8 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-17 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <a
                href={PARTNER_APP_URL}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LayoutDashboard className="size-4" />
                Partner portal
              </a>
              <Link href="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                <UserRound className="size-4" />
                {profile?.name ?? "Profile"}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/sign-up">Join khel.com</Link>
              </Button>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open ? (
        <div className="border-t bg-card px-4 py-3 md:hidden">
          <nav className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <a href={PARTNER_APP_URL} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                  <LayoutDashboard className="size-4" />
                  Partner portal
                </a>
                <Link href="/profile" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                  Profile
                </Link>
                <button onClick={handleSignOut} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/5">
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" asChild><Link href="/auth/sign-in">Sign in</Link></Button>
                <Button asChild><Link href="/auth/sign-up">Join now</Link></Button>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
