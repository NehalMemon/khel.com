import type { Metadata } from "next"
import { AuthPageFrame } from "@/components/auth/auth-page-frame"
import { SignUpForm } from "@/components/auth/auth-forms"

export const metadata: Metadata = {
  title: "Create account",
}

export default function SignUpPage() {
  return (
    <AuthPageFrame
      eyebrow="Join the marketplace"
      title="Your next game starts here."
      description="Create one account to discover courts, book time, and keep every booking in one place."
      footer="We only use your phone number for booking updates and partner verification."
      backLink={{ href: "/", label: "Back to discover" }}
    >
      <SignUpForm />
    </AuthPageFrame>
  )
}
