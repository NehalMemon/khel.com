"use client"

import Link from "next/link"
import { Dumbbell, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", inverse ? "text-white" : "text-foreground")}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
        <Dumbbell className="size-4.5" />
      </span>
      <span className="text-lg font-black tracking-[-0.04em]">khel<span className="text-primary">.</span>com</span>
    </Link>
  )
}

export function AdminLogo() {
  return (
    <Link href="/admin" className="inline-flex items-center gap-2.5 text-foreground">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ShieldCheck className="size-4.5" />
      </span>
      <span className="text-lg font-black tracking-[-0.04em]">khel<span className="text-primary">.</span>ops</span>
    </Link>
  )
}
