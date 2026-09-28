import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <Card><CardContent className="flex items-start justify-between gap-4 p-5"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">{icon}</span></CardContent></Card>
  )
}
