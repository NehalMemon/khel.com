"use client"

import { Notice } from "@/components/app/notice"
import { getErrorMessage } from "@/lib/utils"

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="grid gap-4">
      <Notice tone="error" title="Something went wrong in the partner portal">
        {getErrorMessage(error)}
      </Notice>
      <div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
