import type { ReactNode } from "react"
import { AuthShell } from "@/components/auth/auth-shell"

export function AuthPageFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <AuthShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      footer={footer}
    >
      {children}
    </AuthShell>
  )
}
