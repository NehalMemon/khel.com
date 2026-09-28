"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/app/notice"
import { PageLoading } from "@/components/app/loading-state"
import { useAuth, isAdminRole } from "@/components/auth/auth-provider"
import { isSupabaseConfigured } from "@/lib/supabase-browser"

export function AdminRoute({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isLoading, isAuthenticated, profile, signOut, error } = useAuth()
  const configured = isSupabaseConfigured()

  useEffect(() => {
    if (configured && !isLoading && !isAuthenticated && !error) router.replace("/sign-in")
  }, [configured, error, isAuthenticated, isLoading, router])

  if (!configured) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg"><Notice tone="warning" title="Supabase connection required">Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `apps/admin/.env.local` before using the operations console.</Notice></div>
      </main>
    )
  }
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg"><Notice tone="error" title="Could not verify admin session" action={<Button size="sm" variant="outline" onClick={() => void signOut()}>Sign out</Button>}>{error.message}</Notice></div>
      </main>
    )
  }
  if (isLoading || !isAuthenticated) return <PageLoading />
  if (!isAdminRole(profile?.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg text-center"><ShieldX className="mx-auto size-10 text-destructive" /><h1 className="mt-5 text-3xl font-black tracking-[-0.05em]">Admin access required</h1><p className="mt-3 text-muted-foreground">This account does not have an administrative platform role.</p><Button className="mt-6" variant="outline" onClick={() => void signOut()}>Sign out</Button></div>
      </main>
    )
  }
  return children
}
