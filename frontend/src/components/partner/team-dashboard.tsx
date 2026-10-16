"use client"

import { useState } from "react"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { useAuth } from "@/components/auth/auth-provider"
import { usePartnerTeam } from "@/hooks/use-partner-data"
import { formatDateTime } from "@/lib/utils"

type PermissionOption = {
  id: "view_bookings" | "edit_pricing"
  label: string
}

const PERMISSIONS: PermissionOption[] = [
  { id: "view_bookings", label: "View bookings" },
  { id: "edit_pricing", label: "Edit pricing" },
]

export function TeamDashboard() {
  const { profile } = useAuth()
  const teamQuery = usePartnerTeam(profile?.id ?? null)
  const members = teamQuery.data ?? []
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [inviteError, setInviteError] = useState<string | null>(null)

  function togglePermission(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  function handleInvite() {
    // UI only — wiring to a Supabase Edge Function is deferred per the task.
    setInviteError("Inviting team members will be wired to a secure backend Edge Function later.")
    setEmail("")
    setSelected([])
  }

  if (teamQuery.isPending) {
    return <LoadingState label="Loading team members" />
  }
  if (teamQuery.isError) {
    return (
      <Notice tone="error" title="Could not load team members">
        {teamQuery.error.message}
      </Notice>
    )
  }

  return (
    <main className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Partner portal
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Team management</h1>
        <p className="mt-2 text-muted-foreground">
          List of team members across your venues. Invite functionality is UI-only
          for now and will be wired to a backend Edge Function.
        </p>
      </div>

      {inviteError ? (
        <Notice tone="info" title="Invite coming soon">
          {inviteError}
        </Notice>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-primary" />
              <CardTitle>Team members ({members.length})</CardTitle>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus /> Invite team member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite team member</DialogTitle>
                  <DialogDescription>
                    Send an invite to a team member with specific permissions.
                    Wiring to the secure invitation Edge Function is deferred.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Permissions</Label>
                    <div className="grid gap-2">
                      {PERMISSIONS.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                        >
                          <Checkbox
                            checked={selected.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <span className="font-medium">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={!email.trim()}>
                    Send invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {members.length === 0 ? (
            <EmptyState
              title="No team members yet"
              description="Invite a colleague to help manage your venues."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const permissions = Array.isArray(member.permissions)
                    ? (member.permissions as string[])
                    : member.permissions && typeof member.permissions === "object"
                      ? Object.keys(member.permissions as Record<string, unknown>)
                      : []
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="font-semibold">
                          {member.member?.name ?? "Unnamed user"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.member?.email ?? member.user_id}
                        </p>
                      </TableCell>
                      <TableCell>{member.venue_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {permissions.length > 0 ? permissions.join(", ") : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.created_at ? formatDateTime(member.created_at) : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
