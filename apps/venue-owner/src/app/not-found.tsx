import Link from "next/link"
import { EmptyState } from "@/components/app/loading-state"

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-lg">
        <EmptyState
          title="Page not found"
          description="That partner portal page does not exist."
          action={
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Back to overview
            </Link>
          }
        />
      </div>
    </main>
  )
}
