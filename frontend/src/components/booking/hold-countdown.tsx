"use client"

import { useEffect, useState } from "react"
import { Clock3 } from "lucide-react"
import { cn } from "@/lib/utils"

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0")
  const remainder = (seconds % 60).toString().padStart(2, "0")
  return `${minutes}:${remainder}`
}

/**
 * The countdown is driven only by `held_until`, the timestamp returned by the
 * `hold_slot` RPC. There is deliberately no client-side TTL constant: the hold
 * window is a backend rule (`app_config.hold_expiry_minutes`) and inventing one
 * here would let the UI disagree with the database.
 *
 * The parent keys this component by `slot_id`, so a new hold remounts it and the
 * lazy state initializer is always correct for the current deadline.
 */
export function HoldCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string | null | undefined
  onExpire?: () => void
}) {
  const deadline = expiresAt ? Date.parse(expiresAt) : Number.NaN
  const [remaining, setRemaining] = useState(() =>
    Number.isFinite(deadline) ? getRemaining(deadline) : 0,
  )

  useEffect(() => {
    if (!Number.isFinite(deadline)) return
    const timer = window.setInterval(() => {
      const next = getRemaining(deadline)
      setRemaining(next)
      if (next === 0) {
        window.clearInterval(timer)
        onExpire?.()
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [deadline, onExpire])

  if (!Number.isFinite(deadline)) return null

  return (
    <div
      role="timer"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm font-semibold text-warning-foreground",
        remaining === 0 && "bg-destructive/10 text-destructive",
      )}
    >
      <Clock3 className="size-4" />
      {remaining === 0
        ? "Hold expired"
        : `${formatRemaining(remaining)} left to complete payment`}
    </div>
  )
}

function getRemaining(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}
