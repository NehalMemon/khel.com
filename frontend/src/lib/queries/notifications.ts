import type { NotificationRow } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"

/**
 * Shared `public.notifications` reads and self-service updates.
 *
 * Rows are written by the system only (the migration grants no INSERT policy to
 * authenticated users); the frontend can just list its own rows and flip
 * `is_read`. RLS (`user_id = auth.uid()`) is the real authorization boundary.
 */
const notificationFields =
  "id, user_id, type, title, message, action_link, is_read, created_at"

/** How many of the most recent notifications the bell dropdown renders. */
export const NOTIFICATIONS_PAGE_SIZE = 30

function handleError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabaseBrowserClient()
    .from("notifications")
    .select(notificationFields)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_PAGE_SIZE)
  handleError(error)
  return (data as NotificationRow[] | null) ?? []
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabaseBrowserClient()
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
  handleError(error)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabaseBrowserClient()
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)
  handleError(error)
}
