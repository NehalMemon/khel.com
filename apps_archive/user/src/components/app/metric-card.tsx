import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function MetricCard({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: string
  value: string
  detail?: string
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-sm shadow-foreground/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-primary">{icon}</span> : null}
      </div>
      <p className="mt-3 text-3xl font-black tracking-[-0.05em]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}
