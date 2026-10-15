"use client"

import { CalendarClock, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { StatusBadge } from "@/components/app/status-badge"
import type { SlotRow } from "@/lib/database.types"
import { formatDate, formatDateTime, formatTime } from "@/lib/utils"

type PartnerSlotManagerProps = {
  slots: SlotRow[]
  date: string
  hasContext: boolean
  isLoading: boolean
  error?: string
  pending: boolean
  onCycle: (slotId: string, currentStatus: string) => Promise<void>
}

function actionLabel(status: SlotRow["status"]): string | null {
  if (status === "available") return "Block"
  if (status === "blocked") return "Maintenance"
  if (status === "maintenance") return "Restore"
  return null
}

/** Explains why a slot the owner cannot edit is still unavailable. */
function describeLockedSlot(slot: SlotRow): string {
  if (slot.status === "booked") return "Booked and confirmed by a customer"
  if (slot.status === "held" && slot.held_until) {
    return `Held until ${formatDateTime(slot.held_until)}`
  }
  return "Held or booked by a reservation"
}

export function PartnerSlotManager({
  slots,
  date,
  hasContext,
  isLoading,
  error,
  pending,
  onCycle,
}: PartnerSlotManagerProps) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-5 text-primary" />
          Manage generated slots
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-5">
        {!hasContext ? <Notice tone="info" title="Choose a court and date">Select a court and date to inspect its inventory.</Notice> : null}
        {error ? <Notice tone="error" title="Could not load slots">{error}</Notice> : null}
        {isLoading && hasContext ? <LoadingState label="Loading slots" /> : null}
        {hasContext && !isLoading && !error && slots.length === 0 ? <EmptyState title="No slots generated" description="Generate inventory for this court and date to manage availability." /> : null}
        {hasContext && !isLoading && !error && slots.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">{formatDate(date)} · {slots.length} slot{slots.length === 1 ? "" : "s"}</p>
            {slots.map((slot) => {
              const label = actionLabel(slot.status)
              const locked = label === null
              return (
                <div key={slot.id} className="flex flex-col justify-between gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{locked ? describeLockedSlot(slot) : "Partner-controlled availability"}</p>
                    </div>
                    <StatusBadge status={slot.status} />
                  </div>
                  {label ? <Button size="sm" variant="outline" disabled={pending} onClick={() => void onCycle(slot.id, slot.status)}><Wrench />{label}</Button> : <span className="text-xs text-muted-foreground">Managed automatically</span>}
                </div>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
