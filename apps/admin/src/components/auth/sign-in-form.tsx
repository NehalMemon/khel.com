"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Notice } from "@/components/app/notice"
import { getSession, signIn, signOut } from "@/lib/auth"
import { fetchProfile } from "@/lib/queries"
import { isSupabaseConfigured } from "@/lib/supabase-browser"
import { getErrorMessage } from "@/lib/utils"

export function SignInForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: async () => {
      try {
        const session = await getSession()
        if (!session?.user) throw new Error("Your session could not be verified.")
        const profile = await fetchProfile(session.user.id)
        if (profile?.role !== "admin" && profile?.role !== "super_admin") {
          await signOut()
          queryClient.clear()
          setError("This account does not have administrative access.")
          return
        }
        await queryClient.invalidateQueries({ queryKey: ["auth"] })
        router.replace(nextPath)
        router.refresh()
      } catch (caught) {
        await signOut().catch(() => undefined)
        queryClient.clear()
        setError(getErrorMessage(caught))
      }
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError("Enter your admin email and password.")
      return
    }
    try {
      await mutation.mutateAsync({ email, password })
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  if (!isSupabaseConfigured()) return <Notice tone="warning" title="Supabase connection required">Add the public Supabase URL and anon key to `apps/admin/.env.local` to enable sign-in.</Notice>

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      {error ? <Notice tone="error" title="Could not sign in">{error}</Notice> : null}
      <div className="grid gap-2"><Label htmlFor="admin-email">Admin email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="admin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@khel.com" className="h-11 pl-10" required /></div></div>
      <div className="grid gap-2"><Label htmlFor="admin-password">Password</Label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 px-10" required /><Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 size-10 -translate-y-1/2" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></div>
      <Button className="mt-1 w-full" size="lg" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="animate-spin" />Signing in…</> : <><ShieldCheck />Enter operations console</>}</Button>
    </form>
  )
}
