import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle2, MapPinned, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteFooter } from "@/components/app/site-footer"
import { SiteHeader } from "@/components/app/site-header"
import { APP_TAGLINE } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Partner with Khel.com — List your indoor sports venue",
  description: "List your courts on Khel.com, get discovered by local players, and manage bookings all in one dashboard.",
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export default function PartnerLandingPage() {
  return (
    <main>
      <SiteHeader />
      <div className="min-h-[calc(100vh-8.5rem)]">
        <section className="relative overflow-hidden bg-foreground text-background">
          <div className="absolute -right-40 -top-48 size-[34rem] rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-48 left-1/3 size-[28rem] rounded-full bg-primary/70 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                <Sparkles className="size-3.5" />
                For venue partners
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.07em] sm:text-7xl">
                {APP_TAGLINE}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-background/65">
                Turn your courts into bookings. Publish your venue, manage your schedule,
                and connect with players who are ready to play right now.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button size="lg" asChild className="h-12 px-6">
                  <Link href="/partner/apply">
                    Start your application <ArrowRight />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 px-6"
                  asChild
                >
                  <Link href="/partner/sign-in">Already a partner? Sign in</Link>
                </Button>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-background/55">
                <span className="inline-flex items-center gap-1.5">
                  <MapPinned className="size-4 text-accent" /> Karachi, Pakistan
                </span>
                <span>·</span>
                <span>Real-time availability</span>
                <span>·</span>
                <span>Simple payout ledger</span>
              </div>
            </div>
            <div className="relative hidden min-h-80 lg:block">
              <div className="absolute inset-8 rotate-3 rounded-[3rem] border border-accent/30 bg-accent/10" />
              <div className="absolute inset-0 flex flex-col justify-end rounded-[3rem] border border-background/10 bg-background/5 p-8 backdrop-blur-sm">
                <div className="mb-auto flex items-center justify-between">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                    PARTNER PORTAL
                  </span>
                  <span className="text-xs text-background/50">Manage your business</span>
                </div>
                <div className="rounded-2xl border border-background/10 bg-background/10 p-5 backdrop-blur-md">
                  <div className="h-3 w-24 rounded-full bg-background/20" />
                  <div className="mt-3 h-8 w-48 rounded-lg bg-background/15" />
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="h-16 rounded-xl bg-accent/20" />
                    <div className="h-16 rounded-xl bg-background/10" />
                  </div>
                  <div className="mt-5 h-2 w-4/5 rounded-full bg-background/15" />
                  <div className="mt-2 h-2 w-3/5 rounded-full bg-background/10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                Why partner with Khel.com
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Grow your bookings without the hassle
              </h2>
              <p className="mt-3 text-muted-foreground">
                We help venues reach more players, keep availability up to date, and
                track every confirmed booking in one place.
              </p>
              <div className="mt-8 grid gap-6">
                <FeatureItem
                  title="Reach local players"
                  description="Get discovered by people looking for your courts, right when they want to play."
                />
                <FeatureItem
                  title="Keep your calendar in sync"
                  description="Update your slots and block time for maintenance with a simple, owner-friendly dashboard."
                />
                <FeatureItem
                  title="Stay on top of payments"
                  description="Track payment status and payout snapshots from a clear reservations ledger."
                />
              </div>
            </div>
            <Card className="border-primary/10">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Users className="size-5 text-primary" />
                  <CardTitle>Get started in minutes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 p-6">
                <FeatureItem
                  title="1. Apply"
                  description="Share your venue details through a short application form — no technical setup needed."
                />
                <FeatureItem
                  title="2. Get reviewed"
                  description="Our team reviews your application and keeps you updated on the status."
                />
                <FeatureItem
                  title="3. Go live"
                  description="Once approved, publish courts, manage slots, and start accepting bookings."
                />
                <div className="mt-3 flex gap-3">
                  <Button asChild>
                    <Link href="/partner/apply">Apply now <ArrowRight /></Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/partner/sign-in">Sign in</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  )
}
