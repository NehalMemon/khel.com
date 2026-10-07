import type { ReactNode } from "react"
import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground", className)}>
      <LoaderCircle className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingState label="Loading khel.com" />
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed bg-card px-6 py-12 text-center", className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
