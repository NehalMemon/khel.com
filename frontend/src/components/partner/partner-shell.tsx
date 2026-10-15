"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPinned,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/partner", label: "Overview", icon: LayoutDashboard },
  { href: "/partner/courts", label: "Courts", icon: BarChart3 },
  { href: "/partner/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/partner/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/partner/profile", label: "Profile", icon: UserRound },
]

function isActive(pathname: string, href: string): boolean {
  return href === "/partner" ? pathname === "/partner" : pathname === href || pathname.startsWith(`${href}/`)
}

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.push("/partner/sign-in")
    router.refresh()
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[230px_1fr] lg:px-8 lg:py-10">
      <aside className="h-fit rounded-2xl bg-foreground p-3 text-background lg:sticky lg:top-10">
        <div className="flex items-center gap-2 px-3 py-3">
          <MapPinned className="size-5 text-accent" />
          <div className="min-w-0">
            <p className="text-xs text-background/50">Partner portal</p>
            <p className="truncate text-sm font-semibold">{profile?.name ?? "Venue partner"}</p>
          </div>
        </div>
        <nav className="mt-3 grid gap-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-background/65 hover:bg-background/10 hover:text-background",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-6 border-t border-background/10 pt-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-background/65 hover:bg-background/10 hover:text-background"
            onClick={handleSignOut}
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
