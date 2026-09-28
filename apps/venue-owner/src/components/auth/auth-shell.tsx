import Link from "next/link"
import { ArrowLeft, Dumbbell } from "lucide-react"
import { Logo } from "@/components/app/logo"

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  backLink,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer: React.ReactNode
  /** Optional; the portal root is authenticated, so pages opt in explicitly. */
  backLink?: { href: string; label: string }
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-foreground px-4 py-6 text-background sm:px-6">
      <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-primary/40 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <div className="flex items-center justify-between">
          <Logo inverse />
          {backLink ? (
            <Link
              href={backLink.href}
              className="inline-flex items-center gap-2 text-sm text-background/70 transition-colors hover:text-background"
            >
              <ArrowLeft className="size-4" />
              {backLink.label}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-accent text-foreground shadow-lg shadow-accent/20">
              <Dumbbell className="size-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-background/65">{description}</p>
            <div className="mt-8 rounded-3xl bg-background p-5 text-foreground shadow-2xl shadow-black/20 sm:p-7">
              {children}
            </div>
            <div className="mt-5 text-center text-sm text-background/60">{footer}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
