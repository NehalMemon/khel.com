import type { ReactNode } from "react"
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type NoticeTone = "info" | "success" | "warning" | "error"

const toneClasses: Record<NoticeTone, string> = {
  info: "border-info/25 bg-info/10 text-info",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  error: "border-destructive/25 bg-destructive/10 text-destructive",
}

const toneIcons: Record<NoticeTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
}

export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: NoticeTone
  title: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  const Icon = toneIcons[tone]
  return (
    <Alert className={cn(toneClasses[tone], className)}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  )
}
