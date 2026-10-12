import Link from "next/link"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Compass className="size-7" /></div>
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">That court is off the map.</h1>
      <p className="mt-4 text-muted-foreground">The page may have moved, or the venue is no longer published.</p>
      <Button className="mt-7" asChild><Link href="/">Back to discover</Link></Button>
    </main>
  )
}
