import type { Metadata } from "next"
import { AuthPageFrame } from "@/components/auth/auth-page-frame"
import { VenueApplicationForm } from "@/components/partner/venue-application-form"

export const metadata: Metadata = {
  title: "List your venue — Application",
  description: "Apply to list your indoor sports venue on Khel.com.",
}

export default function PartnerApplyPage() {
  return (
    <AuthPageFrame
      eyebrow="Venue onboarding"
      title="Submit your venue application"
      description="Tell us a few details about your venue. Our team will review it and reach out shortly."
      footer="Prefer to manage bookings yourself? You can also create a partner account."
      backLink={{ href: "/partner", label: "Back to overview" }}
    >
      <VenueApplicationForm />
    </AuthPageFrame>
  )
}
