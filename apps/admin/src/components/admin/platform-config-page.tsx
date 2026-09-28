"use client"

import { useState } from "react"
import { Clock3, Coins, Loader2, MapPinned, RotateCcw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Notice } from "@/components/app/notice"
import { LoadingState } from "@/components/app/loading-state"
import { useAuth } from "@/components/auth/auth-provider"
import { useUpdateAppConfigMutation } from "@/hooks/use-data"
import { APP_CONFIG_FALLBACK, useAppConfig } from "@/lib/app-config"
import type { AppConfigValues } from "@/lib/queries"
import { validateAppConfig } from "@/lib/queries"
import { getErrorMessage } from "@/lib/utils"

type Draft = { commission: string; radius: string; hold: string }

function toDraft(values: AppConfigValues): Draft {
  return {
    commission: String(values.commission_rate),
    radius: String(values.default_search_radius_km),
    hold: String(values.hold_expiry_minutes),
  }
}

function fromDraft(draft: Draft): AppConfigValues {
  return {
    commission_rate: Number(draft.commission),
    default_search_radius_km: Number(draft.radius),
    hold_expiry_minutes: Number(draft.hold),
  }
}

function ConfigForm({ stored }: { stored: AppConfigValues }) {
  const mutation = useUpdateAppConfigMutation()
  const [draft, setDraft] = useState<Draft>(() => toDraft(stored))
  const [saved, setSaved] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const validationError = validateAppConfig(fromDraft(draft))
  const dirty = JSON.stringify(fromDraft(draft)) !== JSON.stringify(stored)

  function update(patch: Partial<Draft>) {
    setSaved(false)
    setDraft((current) => ({ ...current, ...patch }))
  }

  async function handleSave() {
    setActionError(null)
    setSaved(false)
    try {
      await mutation.mutateAsync(fromDraft(draft))
      setSaved(true)
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  return (
    <>
      {actionError ? (
        <Notice tone="error" title="Could not save configuration">
          {actionError}
        </Notice>
      ) : null}
      {saved ? (
        <Notice tone="success" title="Configuration saved">
          The customer and venue-owner apps pick up these values on their next fetch.
        </Notice>
      ) : null}

      <form
        className="grid gap-4 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSave()
        }}
      >
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <Coins className="size-5" />
              </span>
              <div>
                <CardTitle>Commission</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Rate between 0 and 1</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 pt-5">
            <Label htmlFor="commission">commission_rate</Label>
            <Input
              id="commission"
              name="commission_rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="1"
              value={draft.commission}
              onChange={(event) => update({ commission: event.target.value })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <MapPinned className="size-5" />
              </span>
              <div>
                <CardTitle>Search radius</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Kilometres, 1 to 200</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 pt-5">
            <Label htmlFor="radius">default_search_radius_km</Label>
            <Input
              id="radius"
              name="default_search_radius_km"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              max="200"
              value={draft.radius}
              onChange={(event) => update({ radius: event.target.value })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <Clock3 className="size-5" />
              </span>
              <div>
                <CardTitle>Hold expiry</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Minutes, 1 to 120</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 pt-5">
            <Label htmlFor="hold">hold_expiry_minutes</Label>
            <Input
              id="hold"
              name="hold_expiry_minutes"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              max="120"
              value={draft.hold}
              onChange={(event) => update({ hold: event.target.value })}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <Button
            type="submit"
            disabled={!dirty || Boolean(validationError) || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Save configuration
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty || mutation.isPending}
            onClick={() => {
              setDraft(toDraft(stored))
              setActionError(null)
              setSaved(false)
            }}
          >
            <RotateCcw />
            Reset
          </Button>
          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}
        </div>
      </form>
    </>
  )
}

export function PlatformConfigPage() {
  const { profile } = useAuth()
  const configQuery = useAppConfig()

  if (configQuery.isPending) return <LoadingState label="Loading platform configuration" />

  const stored = configQuery.data ?? APP_CONFIG_FALLBACK

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Platform settings
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Configuration</h1>
        <p className="mt-2 text-muted-foreground">
          These values live in the `app_config` singleton and are read at runtime by the
          customer and venue-owner apps. Nothing here is hardcoded in a component.
        </p>
      </div>

      {configQuery.isError ? (
        <Notice tone="warning" title="Using migration defaults">
          The `app_config` row could not be read, so the column defaults from migration
          20260925142542 are shown. Saving will fail until the row is readable.
        </Notice>
      ) : null}

      <ConfigForm key={`${stored.commission_rate}:${stored.default_search_radius_km}:${stored.hold_expiry_minutes}`} stored={stored} />

      <Card className="border-primary/15">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Role policy</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You are signed in as {profile?.role}. Writes are additionally enforced by the
                `admin_update_app_config` policy, which requires `public.is_admin()`.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
