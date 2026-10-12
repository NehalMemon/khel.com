"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <h1 className="mt-5 text-3xl font-black tracking-[-0.05em]">Something went wrong.</h1>
      <p className="mt-3 text-muted-foreground">Your data is safe. Retry the page, or return to the marketplace.</p>
      <Button className="mt-6" onClick={reset}><RotateCcw />Try again</Button>
    </main>
  )
}
