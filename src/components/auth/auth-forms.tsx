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
import { getErrorMessage, getPasswordStrength, normalizePhone } from "@/lib/utils"
import { signIn, signUp } from "@/lib/auth"

export function CustomerSignInForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => signIn({ email, password }),
  })

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
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-11 pr-11" />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Signing in…" : "Sign in"}
        {!mutation.isPending ? <ArrowRight /> : null}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to khel.com? <Link href="/auth/sign-up" className="font-semibold text-primary hover:underline">Create an account</Link>
      </p>
    </form>
  )
}

export function SignUpForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const strength = getPasswordStrength(password)
  const mutation = useMutation({
    mutationFn: () => signUp({ name, email, phone, password, role: "customer" }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!normalizePhone(phone)) {
      setError("Enter a valid Pakistani mobile number, such as 03001234567.")
      return
    }
    try {
      const result = await mutation.mutateAsync()
      if (result.session) {
        router.push("/")
        router.refresh()
      } else {
        setSubmitted(true)
      }
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  if (submitted) {
    return (
      <div className="grid gap-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><ArrowRight className="size-6" /></div>
        <div>
          <h2 className="text-xl font-bold">Check your inbox</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">We sent a confirmation link to {email}. Confirm it to activate your khel.com account.</p>
        </div>
        <Button variant="outline" asChild><Link href="/auth/sign-in">Back to sign in</Link></Button>
      </div>
    )
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      {error ? <Notice tone="error" title="Could not create account">{error}</Notice> : null}
      <div className="grid gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Mobile number</Label>
        <Input id="phone" type="tel" autoComplete="tel" placeholder="0300 1234567" value={phone} onChange={(event) => setPhone(event.target.value)} required className="h-11" />
        <p className="text-xs text-muted-foreground">We normalize this to E.164 before creating your profile.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className="h-11 pr-11" />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${strength.percentage}%` }} /></div>
          <span className="text-muted-foreground">{strength.label}</span>
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating account…" : "Create account"}
        {!mutation.isPending ? <ArrowRight /> : null}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Own a venue?{" "}
        <Link href="/partner/join" className="font-semibold text-primary hover:underline">List it on the partner portal</Link>
      </p>
    </form>
  )
}
