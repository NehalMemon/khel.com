"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"
import type { ProfileRow, UserRole } from "@/lib/database.types"
import { getSession, signOut as signOutRequest } from "@/lib/auth"
import { fetchProfile } from "@/lib/queries"
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase-browser"

type AuthContextValue = {
  user: User | null
  session: Awaited<ReturnType<typeof getSession>>
  profile: ProfileRow | null
  isLoading: boolean
  isAuthenticated: boolean
  error: Error | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const sessionQuery = useQuery({
    queryKey: ["auth", "session"],
    queryFn: getSession,
    staleTime: 30_000,
  })
  const userId = sessionQuery.data?.user.id
  const profileQuery = useQuery({
    queryKey: ["auth", "profile", userId],
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
  })
  const signOutMutation = useMutation({ mutationFn: signOutRequest })

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const client = getSupabaseBrowserClient()
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: ["auth"] })
    })
    return () => subscription.unsubscribe()
  }, [queryClient])

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["auth", "profile"] })
  }, [queryClient])

  const signOut = useCallback(async () => {
    await signOutMutation.mutateAsync()
    queryClient.clear()
  }, [queryClient, signOutMutation])

  const value: AuthContextValue = {
    user: sessionQuery.data?.user ?? null,
    session: sessionQuery.data ?? null,
    profile: profileQuery.data ?? null,
    isLoading: sessionQuery.isPending || (Boolean(userId) && profileQuery.isPending),
    isAuthenticated: Boolean(sessionQuery.data),
    error: sessionQuery.error ?? profileQuery.error,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin"
}
