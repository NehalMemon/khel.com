import type { ReactNode } from "react"
import { AuthShell } from "@/components/auth/auth-shell"

export function AuthPageFrame({
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
  children: ReactNode
  footer: ReactNode
  backLink?: { href: string; label: string }
}) {
  return (
    <AuthShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      footer={footer}
      backLink={backLink}
    >
      {children}
    </AuthShell>
  )
}
