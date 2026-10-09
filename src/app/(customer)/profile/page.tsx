import type { Metadata } from "next"
import { ProfilePage } from "@/components/app/profile-page"
import { ProtectedRoute } from "@/components/app/protected-route"

export const metadata: Metadata = {
  title: "Profile",
}

export default function ProfileRoute() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  )
}
