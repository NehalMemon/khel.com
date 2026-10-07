"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { BarChart3, Building2, CalendarRange, LayoutDashboard, LogOut, Settings2, Store, Swords, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminLogo } from "@/components/app/logo"
import { useAuth } from "@/components/auth/auth-provider"
import { StatusBadge } from "@/components/app/status-badge"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/venues/review", label: "Venue review", icon: BarChart3 },
  { href: "/venues", label: "All venues", icon: Building2 },
  { href: "/courts", label: "Courts", icon: Swords },
  { href: "/partners", label: "Venue owners", icon: Store },
  { href: "/users", label: "Users", icon: Users },
  { href: "/bookings", label: "Bookings", icon: CalendarRange },
  { href: "/config", label: "Platform config", icon: Settings2 },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.replace("/sign-in")
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="rounded-xl bg-background/6 p-3 [&_a]:text-sidebar-foreground"><AdminLogo /></div>
        <nav className="mt-6 grid gap-1">{navigation.map((item) => { const Icon = item.icon; const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground")}><Icon className="size-4" />{item.label}</Link> })}</nav>
        <div className="mt-auto rounded-xl border border-sidebar-border p-3"><p className="truncate text-sm font-semibold">{profile?.name}</p><p className="mt-1"><StatusBadge status={profile?.role ?? "customer"} /></p><Button variant="ghost" className="mt-3 w-full justify-start text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleSignOut}><LogOut />Sign out</Button></div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:hidden"><div className="flex items-center justify-between gap-4"><AdminLogo /><Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleSignOut}><LogOut /></Button></div><nav className="mt-3 flex gap-1 overflow-x-auto pb-1">{navigation.map((item) => { const Icon = item.icon; const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><Icon className="size-4" />{item.label}</Link> })}</nav></header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>
    </div>
  )
}
