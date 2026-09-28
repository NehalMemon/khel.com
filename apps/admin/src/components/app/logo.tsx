import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export function AdminLogo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 text-foreground">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ShieldCheck className="size-4.5" />
      </span>
      <span className="text-lg font-black tracking-[-0.04em]">khel<span className="text-primary">.</span>ops</span>
    </Link>
  )
}
