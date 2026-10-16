"use client"

import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, LoadingState } from "@/components/app/loading-state"
import { Notice } from "@/components/app/notice"
import { StatusBadge } from "@/components/app/status-badge"
import { useVenueApplications } from "@/hooks/use-applications"
import { formatDateTime, formatPhone } from "@/lib/utils"

export function AdminApplicationsPage() {
  const applicationsQuery = useVenueApplications()
  const rows = applicationsQuery.data ?? []

  if (applicationsQuery.isPending) {
    return <LoadingState label="Loading venue applications" />
  }
  if (applicationsQuery.isError) {
    return (
      <Notice tone="error" title="Could not load applications">
        {applicationsQuery.error.message}
      </Notice>
    )
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Onboarding
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Venue applications</h1>
        <p className="mt-2 text-muted-foreground">
          Review new venue partner applications. Approval and rejection actions will
          be wired to backend APIs later.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Building2 className="size-5 text-primary" />
            <CardTitle>Pending applications ({rows.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <EmptyState
              title="No pending applications"
              description="New submissions from the partner application form will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <p className="font-semibold">{application.applicant_name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">{application.venue_name}</p>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {application.venue_address}
                    </TableCell>
                    <TableCell>
                      <p>{application.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPhone(application.phone)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(application.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          aria-label="Approve application (not wired yet)"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          aria-label="Reject application (not wired yet)"
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
