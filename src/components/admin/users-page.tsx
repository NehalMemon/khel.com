"use client"

import { useMemo, useState } from "react"
import { Loader2, Search, ShieldCheck, Users as UsersIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { StatusBadge } from "@/components/app/status-badge"
import { useUpdateRoleMutation, useUpdateTierMutation, useUsers } from "@/hooks/use-admin-data"
import type { SubscriptionTier, UserRole } from "@/lib/database.types"
import { formatDateTime, formatPhone, getErrorMessage, isPendingPhone } from "@/lib/utils"

const ALL_ROLES: UserRole[] = [
  "customer",
  "venue_owner",
  "venue_staff",
  "admin",
  "super_admin",
]

function displayName(name: string | null | undefined, userId: string): string {
  if (name && name.trim()) return name
  return `User ${userId.slice(0, 8)}`
}

export function UsersPage() {
  const usersQuery = useUsers()
  const roleMutation = useUpdateRoleMutation()
  const tierMutation = useUpdateTierMutation()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all")
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const users = useMemo(() => {
    const rows = usersQuery.data ?? []
    const needle = search.trim().toLowerCase()
    return rows.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false
      if (!needle) return true
      const label = displayName(user.name, user.id).toLowerCase()
      return label.includes(needle) || user.id.toLowerCase().includes(needle)
    })
  }, [roleFilter, search, usersQuery.data])

  async function changeRole(userId: string, role: UserRole) {
    setActionError(null)
    setPendingId(userId)
    try {
      await roleMutation.mutateAsync({ userId, role })
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setPendingId(null)
    }
  }

  async function changeTier(userId: string, tier: SubscriptionTier) {
    setActionError(null)
    setPendingId(userId)
    try {
      await tierMutation.mutateAsync({ userId, tier })
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setPendingId(null)
    }
  }

  if (usersQuery.isPending) return <LoadingState label="Loading platform users" />
  if (usersQuery.isError) {
    return (
      <Notice tone="error" title="Could not load users">
        {usersQuery.error.message}
      </Notice>
    )
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Directory
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Users</h1>
        <p className="mt-2 text-muted-foreground">
          Every row comes from `profiles`. Role and subscription changes are re-checked by the
          `subscription_tier` security trigger, which blocks self-promotion.
        </p>
      </div>

      {actionError ? (
        <Notice tone="error" title="Could not update the user">
          {actionError}
        </Notice>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <UsersIcon className="size-5 text-primary" />
              <CardTitle>{users.length} accounts</CardTitle>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search users"
                  placeholder="Search name or id"
                  className="pl-9 sm:w-64"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) =>
                  setRoleFilter(value === "all" ? "all" : (value as UserRole))
                }
              >
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {users.length === 0 ? (
            <EmptyState
              title="No matching users"
              description="Adjust the search or role filter to widen the result set."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const busy = pendingId === user.id
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <p className="font-semibold">{displayName(user.name, user.id)}</p>
                        <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {isPendingPhone(user.phone) ? (
                          <span className="text-amber-700">Awaiting phone</span>
                        ) : (
                          formatPhone(user.phone) || "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          disabled={busy}
                          onValueChange={(value) => void changeRole(user.id, value as UserRole)}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                <StatusBadge status={role} />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.subscription_tier}
                          disabled={busy}
                          onValueChange={(value) =>
                            void changeTier(user.id, value as SubscriptionTier)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">
                              <StatusBadge status="free" />
                            </SelectItem>
                            <SelectItem value="premium">
                              <StatusBadge status="premium" />
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          formatDateTime(user.created_at)
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/15">
        <CardContent className="flex gap-3 p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Client controls are a convenience layer only. Every write here is authorised by
            database policies and triggers, so a rejected change surfaces as an error rather
            than a silent no-op.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
