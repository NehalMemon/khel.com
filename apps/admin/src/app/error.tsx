"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div><AlertTriangle className="mx-auto size-10 text-destructive" /><h1 className="mt-5 text-3xl font-black tracking-[-0.05em]">The console hit an unexpected error.</h1><p className="mt-3 text-muted-foreground">Retry the page before escalating this issue.</p><Button className="mt-6" onClick={reset}><RotateCcw />Try again</Button></div>
    </main>
  )
}
