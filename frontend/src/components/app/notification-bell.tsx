"use client"

import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth/auth-provider"
import { useNotificationContext } from "@/components/app/notification-provider"
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/hooks/use-notifications"
import type { NotificationRow } from "@/lib/database.types"
import { formatDate } from "@/lib/utils"

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

/**
 * Header bell: unread badge + a dropdown of the latest notifications. Selecting
 * a row flips `is_read` and follows `action_link` when present.
 */
export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { notifications, unreadCount, isLoading, isConfigured } = useNotificationContext()
  const markRead = useMarkNotificationReadMutation(userId)
  const markAllRead = useMarkAllNotificationsReadMutation(userId)

  if (!isConfigured || !user) return null

  function handleSelect(notification: NotificationRow) {
    if (!notification.is_read) markRead.mutate(notification.id)
    if (notification.action_link) router.push(notification.action_link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className ?? ""}`}
          aria-label={
            unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
          }
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer flex-col items-start gap-1 py-2"
                onSelect={() => handleSelect(notification)}
              >
                <div className="flex w-full items-center gap-2">
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-full ${
                      notification.is_read ? "bg-transparent" : "bg-primary"
                    }`}
                  />
                  <span className="flex-1 truncate text-sm font-medium">{notification.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>
                <p className="line-clamp-2 pl-4 text-xs text-muted-foreground">
                  {notification.message}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
