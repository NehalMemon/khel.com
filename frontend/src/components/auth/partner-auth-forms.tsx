"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { useMutation } from "@tanstack/react-query"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Notice } from "@/components/app/notice"
import { getErrorMessage } from "@/lib/utils"
import { signIn } from "@/lib/auth"

export function PartnerSignInForm({ nextPath = "/partner/overview" }: { nextPath?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({ mutationFn: () => signIn({ email, password }) })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await mutation.mutateAsync()
      router.push(nextPath)
      router.refresh()
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      {error ? <Notice tone="error" title="Could not sign in">{error}</Notice> : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="h-11 pr-11"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Signing in…" : "Sign in"}
        {!mutation.isPending ? <ArrowRight /> : null}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New partner?{" "}
        <Link href="/partner/apply" className="font-semibold text-primary hover:underline">
          Apply to list your venue
        </Link>
      </p>
    </form>
  )
}
