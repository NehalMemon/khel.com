"use client"

import { useMemo, useState } from "react"
import {
  Check,
  ClipboardList,
  Clock,
  Filter,
  Lock,
  Mail,
  MapPin,
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
  const [processingId, setProcessingId] = useState<string | null>(null)

  const applicationsQuery = useVenueApplications(
    statusFilter === "all" ? undefined : statusFilter,
  )
  const updateMutation = useUpdateVenueApplicationStatusMutation()

  // Admin RAM verification: requires "manage_applications" or "all"
  const canManageApplications = useMemo(() => {
    if (!profile?.platform_permissions) return false
    const perms = Array.isArray(profile.platform_permissions)
      ? (profile.platform_permissions as string[])
      : []
    return perms.includes("all") || perms.includes("manage_applications")
  }, [profile?.platform_permissions])

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

  async function handleUpdateStatus(id: string, newStatus: ApplicationStatus) {
    if (!canManageApplications) return
    setActionError(null)
    setProcessingId(id)
    try {
      await updateMutation.mutateAsync({
        id,
        status: newStatus,
        adminNotes: `Updated to ${newStatus} by ${profile?.name || "admin"}`,
      })
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
                                  onClick={() => handleUpdateStatus(app.id, "approved")}
                                >
                                  <Check className="mr-1 size-3.5" />
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Processed</span>
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
    </div>
  )
}
