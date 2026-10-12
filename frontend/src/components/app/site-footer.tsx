import Link from "next/link"
import { Logo } from "@/components/app/logo"

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted-foreground">Indoor sports, made easy in Karachi.</p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
          <Link href="/auth/sign-up" className="hover:text-foreground">Create account</Link>
          <Link href="/partner/join" className="hover:text-foreground">List your venue</Link>
          <Link href="/profile" className="hover:text-foreground">Your profile</Link>
        </div>
      </div>
    </footer>
  )
}
