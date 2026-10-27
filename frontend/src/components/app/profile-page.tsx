"use client"

import { useState, type FormEvent } from "react"
import { Camera, Check, Clock, LoaderCircle, UserRound } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Notice } from "@/components/app/notice"
import { useAuth } from "@/components/auth/auth-provider"
import { useHoldLogs, useHoldLogsCountThisWeek, useUpdateProfileMutation } from "@/hooks/use-customer-data"
import type { ProfileRow } from "@/lib/database.types"
import { formatDate, formatTime, getAuthErrorMessage, normalizePhone } from "@/lib/utils"

function getFormState(profile: ProfileRow) {
  return {
    name: profile.name,
    phone: profile.phone && !profile.phone.startsWith("pending-") ? profile.phone : "",
    avatarUrl: profile.avatar_url ?? "",
  }
}

function ProfileForm({ profile }: { profile: ProfileRow }) {
  const { refreshProfile } = useAuth()
  const initial = getFormState(profile)
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const mutation = useUpdateProfileMutation()
  const phoneValid = Boolean(normalizePhone(phone))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (!name.trim()) {
      setError("Name is required.")
      return
    }
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      setError("Enter a valid Pakistani mobile number.")
      return
    }
    try {
      await mutation.mutateAsync({ userId: profile.id, values: { name: name.trim(), phone: normalizedPhone, avatar_url: avatarUrl.trim() || null } })
      await refreshProfile()
      setSaved(true)
    } catch (caught) {
      setError(getAuthErrorMessage(caught instanceof Error ? caught.message : "Could not save profile."))
    }
  }

  return (
    <Card className="mt-8"><CardHeader className="border-b"><div className="flex items-center gap-4"><Avatar className="size-14"><AvatarImage src={avatarUrl || profile.avatar_url || undefined} /><AvatarFallback><UserRound /></AvatarFallback></Avatar><div><CardTitle>Personal details</CardTitle><p className="mt-1 text-sm text-muted-foreground">{profile.role === "venue_owner" ? "Venue partner account" : "Customer account"}</p></div></div></CardHeader><CardContent className="pt-6"><form className="grid gap-5" onSubmit={handleSubmit}>{error ? <Notice tone="error" title="Could not save profile">{error}</Notice> : null}{saved ? <Notice tone="success" title="Profile updated"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5" />Your details are saved.</span></Notice> : null}<div className="grid gap-2"><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false) }} required className="h-11" /></div><div className="grid gap-2"><Label htmlFor="profile-phone">Mobile number</Label><Input id="profile-phone" type="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setSaved(false) }} placeholder="0300 1234567" required className="h-11" />{phone && !phoneValid ? <p className="text-xs text-destructive">Enter a valid Pakistani mobile number.</p> : null}</div><div className="grid gap-2"><Label htmlFor="profile-avatar">Avatar URL</Label><div className="relative"><Camera className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-avatar" type="url" value={avatarUrl} onChange={(event) => { setAvatarUrl(event.target.value); setSaved(false) }} placeholder="https://…" className="h-11 pl-10" /></div><p className="text-xs text-muted-foreground">Optional. Paste a public image URL for your profile photo.</p></div><div className="flex justify-end border-t pt-5"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="animate-spin" />Saving…</> : "Save changes"}</Button></div></form></CardContent></Card>
  )
}

export function ProfilePage() {
  const { profile } = useAuth()
  const holdLogsQuery = useHoldLogs(profile?.id ?? null, 5)
  const holdCountQuery = useHoldLogsCountThisWeek(profile?.id ?? null)
  if (!profile) return <main className="mx-auto max-w-3xl px-4 py-10"><Notice tone="error" title="Profile unavailable">Your account profile could not be loaded.</Notice></main>
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Your account</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Profile</h1><p className="mt-2 text-muted-foreground">Keep your contact details current for smooth bookings and venue updates.</p>
      {!profile.phone || profile.phone.startsWith("pending-") ? <Notice tone="warning" title="Your phone number is incomplete" className="mt-6">Add a real mobile number before you book a court or list a venue.</Notice> : null}
      <ProfileForm key={`${profile.id}:${profile.updated_at}`} profile={profile} />
      <Card className="mt-6">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Clock className="size-4 text-primary" />Holds &amp; quota</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Free accounts can hold one court slot every seven days.</p>
            </div>
            <span className="text-sm text-muted-foreground">{holdCountQuery.data ?? 0}/1 this week</span>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {holdLogsQuery.isPending ? <p className="text-sm text-muted-foreground">Loading hold history...</p> : null}
          {!holdLogsQuery.isPending && (holdLogsQuery.data?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No recent holds.</p> : null}
          {(holdLogsQuery.data?.length ?? 0) > 0 ? (
            <div className="grid gap-2">
              {holdLogsQuery.data!.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">Held slot</p>
                    <p className="text-muted-foreground">{log.created_at ? formatDate(log.created_at.split('T')[0]) : ""} {log.start_time ? `• ${formatTime(log.start_time)}` : ""}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
