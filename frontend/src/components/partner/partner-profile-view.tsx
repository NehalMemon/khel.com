"use client"

import { useState, type FormEvent } from "react"
import { Check, LoaderCircle, Phone, Save, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Notice } from "@/components/app/notice"
import { LoadingState } from "@/components/app/loading-state"
import { StatusBadge } from "@/components/app/status-badge"
import { useAuth } from "@/components/auth/auth-provider"
import { useUpdateProfileMutation } from "@/hooks/use-partner-data"
import type { ProfileRow } from "@/lib/database.types"
import {
  APP_NAME,
  formatPhone,
  getErrorMessage,
  isPendingPhone,
  MIN_PASSWORD_LENGTH,
  normalizePhone,
  PHONE_PATTERN,
} from "@/lib/utils"

export function PartnerProfileView() {
  const { profile, user, isLoading } = useAuth()

  if (isLoading) return <LoadingState label="Loading your profile" />
  if (!profile) {
    return (
      <Notice tone="info" title="Profile unavailable">
        We could not load your profile row. Row-level security may be hiding it.
      </Notice>
    )
  }

  // Keyed by profile id so the form always starts from the stored values
  // without needing an effect to copy props into state.
  return <ProfileForm key={profile.id} profile={profile} email={user?.email ?? ""} />
}

function ProfileForm({ profile, email }: { profile: ProfileRow; email: string }) {
  const updateMutation = useUpdateProfileMutation()
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(
    isPendingPhone(profile.phone) ? "" : formatPhone(profile.phone),
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const phoneInvalid =
    phone.trim().length > 0 && !PHONE_PATTERN.test(phone.replace(/[\s()-]/g, ""))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (!name.trim()) {
      setError("Your name is required.")
      return
    }
    const values: { name: string; phone?: string } = { name: name.trim() }
    if (phone.trim()) {
      const normalized = normalizePhone(phone)
      if (!normalized) {
        setError("Enter a valid Pakistani mobile number, such as 03001234567.")
        return
      }
      values.phone = normalized
    }
    try {
      await updateMutation.mutateAsync({ userId: profile.id, values })
      setSaved(true)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <main className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Partner portal
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Keep your contact details current so the platform can reach you about bookings.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" />
            Account details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            {error ? (
              <Notice tone="error" title="Could not save profile">
                {error}
              </Notice>
            ) : null}
            {saved ? (
              <Notice tone="success" title="Profile saved">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5" />
                  Your details are up to date.
                </span>
              </Notice>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setSaved(false)
                  }}
                  className="h-11"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Email changes are handled by Supabase Auth, not this portal.
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-phone">Mobile number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value)
                    setSaved(false)
                  }}
                  placeholder="0300 1234567"
                  aria-invalid={phoneInvalid}
                  aria-describedby="profile-phone-hint"
                  className="h-11 pl-10"
                />
              </div>
              <p id="profile-phone-hint" className="text-xs text-muted-foreground">
                {phoneInvalid
                  ? "Enter a valid Pakistani mobile number, such as 03001234567."
                  : "Stored as E.164. Venue submissions require a valid number."}
              </p>
            </div>
            <div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Save />
                )}
                {updateMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Access
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Role</span>
            <StatusBadge status={profile.role} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Subscription tier</span>
            <StatusBadge status={profile.subscription_tier} />
          </div>
          <Notice tone="info" title="Permissions">
            This portal only manages venues you own. Row-level security in the database is the
            authorization boundary, so anything you cannot see here is also blocked at the API.
          </Notice>
          <Notice tone="info" title="Password">
            Passwords are managed by Supabase Auth with a minimum of {MIN_PASSWORD_LENGTH}{" "}
            characters. Update them from the {APP_NAME} customer app account settings.
          </Notice>
        </CardContent>
      </Card>
    </main>
  )
}
