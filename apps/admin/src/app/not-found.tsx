import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div><FileQuestion className="mx-auto size-10 text-primary" /><p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-primary">404</p><h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">Console page not found.</h1><Button className="mt-6" asChild><Link href="/">Return to overview</Link></Button></div>
    </main>
  )
}
