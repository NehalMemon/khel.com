import { Badge } from "@/components/ui/badge"
import type {
  BookingStatus,
  PaymentStatus,
  SlotStatus,
  SubscriptionTier,
  UserRole,
  VenueStatus,
} from "@/lib/database.types"
import { cn } from "@/lib/utils"

type StatusValue =
  | BookingStatus
  | PaymentStatus
  | SlotStatus
  | VenueStatus
  | UserRole
  | SubscriptionTier

const labels: Record<StatusValue, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled_by_customer: "Cancelled by customer",
  cancelled_by_venue: "Cancelled by venue",
  no_show: "No show",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  available: "Available",
  held: "Held",
  booked: "Booked",
  blocked: "Blocked",
  maintenance: "Maintenance",
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  suspended: "Suspended",
  archived: "Archived",
  customer: "Customer",
  venue_owner: "Venue owner",
  venue_staff: "Venue staff",
  admin: "Admin",
  super_admin: "Super admin",
  free: "Free",
  premium: "Premium",
}

const classes: Record<StatusValue, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-700",
  completed: "bg-sky-500/10 text-sky-700",
  cancelled_by_customer: "bg-slate-500/10 text-slate-700",
  cancelled_by_venue: "bg-slate-500/10 text-slate-700",
  no_show: "bg-amber-500/10 text-amber-700",
  pending: "bg-amber-500/10 text-amber-700",
  paid: "bg-emerald-500/10 text-emerald-700",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-violet-500/10 text-violet-700",
  available: "bg-emerald-500/10 text-emerald-700",
  held: "bg-amber-500/10 text-amber-700",
  booked: "bg-primary/10 text-primary",
  blocked: "bg-slate-500/10 text-slate-700",
  maintenance: "bg-orange-500/10 text-orange-700",
  draft: "bg-slate-500/10 text-slate-700",
  submitted: "bg-sky-500/10 text-sky-700",
  under_review: "bg-amber-500/10 text-amber-700",
  approved: "bg-emerald-500/10 text-emerald-700",
  published: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-orange-500/10 text-orange-700",
  archived: "bg-slate-500/10 text-slate-700",
  customer: "bg-sky-500/10 text-sky-700",
  venue_owner: "bg-primary/10 text-primary",
  venue_staff: "bg-violet-500/10 text-violet-700",
  admin: "bg-foreground/10 text-foreground",
  super_admin: "bg-foreground text-background",
  free: "bg-slate-500/10 text-slate-700",
  premium: "bg-accent/20 text-foreground",
}

export function StatusBadge({ status }: { status: StatusValue }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", classes[status])}>
      {labels[status]}
    </Badge>
  )
}
