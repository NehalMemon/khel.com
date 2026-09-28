import type { Metadata } from "next"
import { DiscoverPage } from "@/components/app/discover-page"

export const metadata: Metadata = {
  title: "Discover indoor sports venues",
}

export default function HomePage() {
  return <DiscoverPage />
}
