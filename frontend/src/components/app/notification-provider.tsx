"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/auth/auth-provider"
import { notificationKeys, useNotifications } from "@/hooks/use-notifications"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"
import type { NotificationRow } from "@/lib/database.types"

type NotificationContextValue = {
  /** The signed-in user's latest notifications (newest first). */
  notifications: NotificationRow[]
  /** Count of rows where `is_read === false`. */
  unreadCount: number
  isLoading: boolean
  /** False when the Supabase env vars are missing (e.g. static preview). */
  isConfigured: boolean
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

/**
 * App-wide notification state.
 *
 * Owns a single Supabase Realtime channel that listens for `INSERT` events on
 * `public.notifications` scoped to the authenticated user and invalidates the
 * React Query cache so the bell updates without a refresh. RLS already limits
 * each subscriber to its own rows; the channel filter is a bandwidth nicety.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const notificationsQuery = useNotifications(userId)

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return
    const client = getSupabaseBrowserClient()
    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) })
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [userId, queryClient])

  const notifications = notificationsQuery.data ?? []
  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isPending,
    isConfigured: isSupabaseConfigured(),
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotificationContext must be used inside NotificationProvider")
  }
  return context
}
