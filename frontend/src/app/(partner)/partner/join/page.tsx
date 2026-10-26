import { redirect } from "next/navigation"

/**
 * Legacy self-service partner signup. Venue owners are no longer created
 * directly in `auth.users`; they must submit a `venue_applications` row and be
 * approved by an admin first. Keep this route as a permanent bridge for old
 * links, and send everyone to the application form.
 */
export default function PartnerJoinPage() {
  redirect("/partner/apply")
}
