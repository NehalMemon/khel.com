import type { Metadata } from "next"
import { AuthPageFrame } from "@/components/auth/auth-page-frame"
import { PartnerSignUpForm } from "@/components/auth/partner-auth-forms"

export const metadata: Metadata = { title: "List your venue" }

export default function JoinPage() {
  return (
    <AuthPageFrame
      eyebrow="For venue partners"
      title="Turn your courts into bookings."
      description="Create a partner account to publish your venue, manage courts and schedules, and stay on top of every booking."
      footer="Already a partner? Sign in to open your portal."
      backLink={{ href: "/partner/sign-in", label: "Sign in" }}
    >
      <PartnerSignUpForm />
    </AuthPageFrame>
  )
}
