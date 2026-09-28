import type { ReactNode } from "react"
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type Tone = "info" | "success" | "warning" | "error"
const tones: Record<Tone, string> = {
  info: "border-info/25 bg-info/10 text-info",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  error: "border-destructive/25 bg-destructive/10 text-destructive",
}
const icons: Record<Tone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
}

export function Notice({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: Tone
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  const Icon = icons[tone]
  return (
    <Alert className={cn(tones[tone], className)}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  )
}
