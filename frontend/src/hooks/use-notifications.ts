"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/queries/notifications"

/* ------------------------------- keys ----------------------------------- */

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (userId: string | null) => [...notificationKeys.all, "list", userId] as const,
}

/* ------------------------------- queries -------------------------------- */

export function useNotifications(userId: string | null) {
  return useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: () => fetchNotifications(userId as string),
    enabled: Boolean(userId),
  })
}

/* ------------------------------ mutations ------------------------------- */

export function useMarkNotificationReadMutation(userId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) })
    },
  })
}

export function useMarkAllNotificationsReadMutation(userId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) })
    },
  })
}
