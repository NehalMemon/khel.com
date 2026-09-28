"use client"

import type { ReactNode } from "react"
import { AdminRoute } from "@/components/admin/admin-route"
import { AdminShell } from "@/components/admin/admin-shell"

export function AdminConsole({ children }: { children: ReactNode }) {
  return <AdminRoute><AdminShell>{children}</AdminShell></AdminRoute>
}
