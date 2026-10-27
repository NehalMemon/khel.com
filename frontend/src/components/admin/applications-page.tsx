"use client"

import { useMemo, useState } from "react"
import {
  Check,
  Clock,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { useAuth } from "@/components/auth/auth-provider"
import {
  useApproveVenueApplicationMutation,
  useUpdateVenueApplicationStatusMutation,
  useVenueApplications,
} from "@/hooks/use-admin-data"
import type { ApplicationStatus } from "@/lib/database.types"
import { formatDateTime, getErrorMessage } from "@/lib/utils"

export function ApplicationsPage() {
  const { profile } = useAuth()
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("pending")
  const [search, setSearch] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | null>(null)
  const [adminNotes, setAdminNotes] = useState("")

  const applicationsQuery = useVenueApplications(
    statusFilter === "all" ? undefined : statusFilter,
  )
  const updateMutation = useUpdateVenueApplicationStatusMutation()
  // Approval is orchestrated server-side: the `approve-venue` Edge Function
  // sends the invite, provisions the venue owner account, and flips the
  // application status. Rejection has nothing to orchestrate, so it stays on
  // the direct status mutation below.
  const approveMutation = useApproveVenueApplicationMutation()

  // Admin RAM verification: requires "manage_applications" or "all"
  // (Computed inline so the React Compiler doesn't flag manual memoization.)
  const platformPermissions = Array.isArray(profile?.platform_permissions)
    ? (profile.platform_permissions as string[])
    : []
  const canManageApplications =
    platformPermissions.includes("all") || platformPermissions.includes("manage_applications")

  const filteredApplications = useMemo(() => {
    const rows = applicationsQuery.data ?? []
    const query = search.trim().toLowerCase()
    if (!query) return rows

    return rows.filter((app) => {
      return (
        app.applicant_name.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query) ||
        app.phone.toLowerCase().includes(query) ||
        app.venue_name.toLowerCase().includes(query) ||
        app.venue_address.toLowerCase().includes(query)
      )
    })
  }, [applicationsQuery.data, search])

  function openNotesDialog(id: string, status: ApplicationStatus) {
    setSelectedAppId(id)
    setSelectedStatus(status)
    setAdminNotes(`Updated to ${status} by ${profile?.name || "admin"}`)
    setNotesDialogOpen(true)
  }

  async function confirmUpdateStatus() {
    if (!selectedAppId || !selectedStatus || !canManageApplications) return
    setActionError(null)
    setActionSuccess(null)
    setProcessingId(selectedAppId)
    try {
      await updateMutation.mutateAsync({
        id: selectedAppId,
        status: selectedStatus,
        adminNotes: adminNotes.trim() || undefined,
      })
      setActionSuccess(`Application ${selectedStatus}.`)
      setNotesDialogOpen(false)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setProcessingId(null)
    }
  }

  async function handleUpdateStatus(id: string, newStatus: ApplicationStatus) {
    if (!canManageApplications) return
    openNotesDialog(id, newStatus)
  }

  /**
   * Approve goes through the `approve-venue` Edge Function, which owns the
   * whole orchestration (invite email → venue owner account → venue + status
   * flip) and reports back its message for the success notice.
   */
  async function handleApprove(id: string) {
    if (!canManageApplications) return
    setSelectedAppId(id)
    setSelectedStatus("approved")
    setAdminNotes(`Approved by ${profile?.name || "admin"}`)
    setNotesDialogOpen(true)
  }

  async function confirmApprove() {
    if (!selectedAppId || !canManageApplications) return
    setActionError(null)
    setActionSuccess(null)
    setProcessingId(selectedAppId)
    try {
      const result = await approveMutation.mutateAsync(selectedAppId)
      if (adminNotes.trim()) {
        try {
          await updateMutation.mutateAsync({
            id: selectedAppId,
            status: "approved",
            adminNotes: adminNotes.trim(),
          })
        } catch {
          // ignore
        }
      }
      setActionSuccess(result.message ?? "Application approved.")
      setNotesDialogOpen(false)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setProcessingId(null)
    }
  }

  function getStatusBadge(status: ApplicationStatus) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="mr-1 size-3" /> Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Check className="mr-1 size-3" /> Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
            <X className="mr-1 size-3" /> Rejected
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="grid gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Partner Operations
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
            Venue Applications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review partner requests and approve new venue owner registrations.
          </p>
        </div>

        {/* RAM Status Pill */}
        <div className="flex items-center gap-2">
          {canManageApplications ? (
            <Badge variant="secondary" className="gap-1.5 py-1 text-xs">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>Full Manager Access</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 py-1 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-amber-500" />
              <span>Read-only View</span>
            </Badge>
          )}
        </div>
      </div>

      {actionError ? (
        <Notice tone="error" title="Action failed">
          {actionError}
        </Notice>
      ) : null}
      {actionSuccess ? (
        <Notice tone="success" title="Done">
          {actionSuccess}
        </Notice>
      ) : null}

      {!canManageApplications ? (
        <Notice tone="info" title="Role-Based Access Control (RAM)">
          Your admin account does not have the <code className="text-xs font-semibold">manage_applications</code> or <code className="text-xs font-semibold">all</code> permission. Actions to approve or reject applications are hidden.
        </Notice>
      ) : null}

      {/* Filter and Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">Application Pipeline</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search applicants, venues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 text-sm"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                {(["pending", "approved", "rejected", "all"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                      statusFilter === filter
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {applicationsQuery.isPending ? (
            <div className="p-8">
              <LoadingState label="Loading applications..." />
            </div>
          ) : applicationsQuery.isError ? (
            <div className="p-6">
              <Notice tone="error" title="Could not load applications">
                {applicationsQuery.error.message}
              </Notice>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title={
                  statusFilter === "pending"
                    ? "No pending applications"
                    : "No applications found"
                }
                description={
                  statusFilter === "pending"
                    ? "Great job! All incoming venue partnership requests have been processed."
                    : "Try adjusting your search query or filter selection."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[200px]">Applicant</TableHead>
                    <TableHead className="w-[220px]">Contact Info</TableHead>
                    <TableHead className="min-w-[240px]">Proposed Venue</TableHead>
                    <TableHead className="w-[140px]">Submitted</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    {canManageApplications ? (
                      <TableHead className="w-[180px] text-right">Actions</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => {
                    const isProcessing = processingId === app.id
                    return (
                      <TableRow key={app.id} className="transition-colors hover:bg-muted/20">
                        {/* Applicant Name */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="size-4" />
                            </div>
                            <span className="font-semibold text-foreground">
                              {app.applicant_name}
                            </span>
                          </div>
                        </TableCell>

                        {/* Contact Details */}
                        <TableCell>
                          <div className="grid gap-1 text-xs">
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                              <Mail className="size-3.5 shrink-0 text-primary" />
                              <a href={`mailto:${app.email}`} className="truncate hover:underline">
                                {app.email}
                              </a>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="size-3.5 shrink-0 text-primary" />
                              <span>{app.phone}</span>
                            </span>
                          </div>
                        </TableCell>

                        {/* Venue Name & Address */}
                        <TableCell>
                          <div className="grid gap-1">
                            <span className="font-semibold text-foreground">
                              {app.venue_name}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3 shrink-0 text-primary" />
                              <span className="truncate">{app.venue_address}</span>
                            </span>
                          </div>
                        </TableCell>

                        {/* Created At */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(app.created_at)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>{getStatusBadge(app.status)}</TableCell>

                        {/* Actions (RAM Protected) */}
                        {canManageApplications ? (
                          <TableCell className="text-right">
                            {app.status === "pending" ? (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateStatus(app.id, "rejected")}
                                >
                                  <X className="mr-1 size-3.5" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                  disabled={isProcessing}
                                  onClick={() => handleApprove(app.id)}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                                  ) : (
                                    <Check className="mr-1 size-3.5" />
                                  )}
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                {app.admin_notes ? (
                                  <span className="text-xs text-muted-foreground max-w-[120px] truncate" title={app.admin_notes}>
                                    <MessageSquare className="inline size-3 mr-1" />{app.admin_notes}
                                  </span>
                                ) : null}
                                <span className="text-xs text-muted-foreground">Processed</span>
                              </div>
                            )}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              {selectedStatus === "approved" ? "Approve Application" : "Reject Application"}
            </DialogTitle>
            <DialogDescription>
              Add admin notes for this application review. These notes will be saved with the status update.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label htmlFor="admin-notes" className="text-sm font-medium">Admin Notes</label>
            <Textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add review notes..."
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)} disabled={processingId !== null}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedStatus === "approved") {
                  void confirmApprove()
                } else if (selectedStatus && selectedAppId) {
                  void confirmUpdateStatus()
                }
              }}
              disabled={processingId !== null}
              className={selectedStatus === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {processingId ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Confirm {selectedStatus}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
