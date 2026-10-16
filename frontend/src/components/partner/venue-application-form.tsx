"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Notice } from "@/components/app/notice"
import { useSubmitVenueApplicationMutation } from "@/hooks/use-applications"
import {
  getErrorMessage,
  normalizePhone,
  PHONE_PATTERN,
} from "@/lib/utils"

export function VenueApplicationForm() {
  const [applicantName, setApplicantName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [venueName, setVenueName] = useState("")
  const [venueAddress, setVenueAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const mutation = useSubmitVenueApplicationMutation()
  const phoneInvalid = phone.trim().length > 0 && !PHONE_PATTERN.test(phone.replace(/[\s()-]/g, ""))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError("Enter a valid Pakistani mobile number, such as 03001234567.")
      return
    }
    try {
      await mutation.mutateAsync({
        applicant_name: applicantName.trim(),
        email: email.trim(),
        phone: normalized,
        venue_name: venueName.trim(),
        venue_address: venueAddress.trim(),
      })
      setSubmitted(true)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  if (submitted) {
    return (
      <div className="grid gap-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Application submitted</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your application is under review. Our team will contact you shortly.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/partner">Back to partner overview</Link>
        </Button>
      </div>
    )
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      {error ? (
        <Notice tone="error" title="Could not submit application">
          {error}
        </Notice>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="applicantName">Your full name</Label>
        <Input
          id="applicantName"
          autoComplete="name"
          placeholder="e.g. Ahmed Khan"
          value={applicantName}
          onChange={(event) => setApplicantName(event.target.value)}
          required
          className="h-11"
        />
      </div>
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
        <Label htmlFor="phone">Mobile number</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0300 1234567"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-invalid={phoneInvalid}
          required
          className="h-11"
        />
        {phoneInvalid ? (
          <p className="text-xs text-destructive">Enter a valid Pakistani mobile number.</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="venueName">Venue name</Label>
        <Input
          id="venueName"
          placeholder="e.g. City Sports Arena"
          value={venueName}
          onChange={(event) => setVenueName(event.target.value)}
          required
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="venueAddress">Venue address</Label>
        <Input
          id="venueAddress"
          placeholder="Street, area, Karachi"
          value={venueAddress}
          onChange={(event) => setVenueAddress(event.target.value)}
          required
          className="h-11"
        />
      </div>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Submitting…" : "Submit application"}
        {!mutation.isPending ? <ArrowRight /> : null}
      </Button>
    </form>
  )
}
