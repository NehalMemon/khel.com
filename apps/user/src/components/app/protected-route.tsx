"use client"

import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { PageLoading } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { Button } from "@/components/ui/button"

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactNode
  requiredRole?: "customer" | "venue_owner" | "admin" | "super_admin"
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading, profile, error, signOut } = useAuth()
  const profileUnavailable = isAuthenticated && !isLoading && !profile && !error

  useEffect(() => {
    if (isLoading || error || profileUnavailable) return
    if (!isAuthenticated) {
      const nextPath = `${window.location.pathname}${window.location.search}`
      router.replace(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`)
      return
    }
    if (requiredRole && profile?.role !== requiredRole) {
      router.replace("/")
    }
  }, [error, isAuthenticated, isLoading, profile?.role, profileUnavailable, requiredRole, router])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <Notice
            tone="error"
            title="Could not verify your profile"
            action={<Button size="sm" variant="outline" onClick={() => void signOut()}>Sign out</Button>}
          >
            {error.message}
          </Notice>
        </div>
      </main>
    )
  }
  if (isLoading || !isAuthenticated) return <PageLoading />
  if (profileUnavailable) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <Notice
            tone="warning"
            title="Profile unavailable"
            action={<Button size="sm" variant="outline" onClick={() => void signOut()}>Sign out</Button>}
          >
            Your account session is valid, but its profile record is unavailable.
          </Notice>
        </div>
      </main>
    )
  }
  if (requiredRole && profile?.role !== requiredRole) return <PageLoading />
  return children
}
