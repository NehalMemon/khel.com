import { useQuery } from "@tanstack/react-query"
import type { AppConfigRow } from "@/lib/database.types"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser"

/**
 * Platform-wide business rules live in the `public.app_config` singleton
 * (migration 20260925142542) and must never be hardcoded in components.
 * See `doc/ARCHITECTURE.md` section 3 and the "Platform Configuration"
 * entry in `doc/HANDOFF.md`.
 *
 * These fallbacks only apply when the row cannot be read (e.g. Supabase is not
 * configured yet). They mirror the migration's column defaults so the UI still
 * renders in a sensible state during local setup.
 */
export const APP_CONFIG_FALLBACK: Omit<AppConfigRow, "id" | "updated_at"> = {
  commission_rate: 0,
  default_search_radius_km: 10,
  hold_expiry_minutes: 5,
}

export const APP_CONFIG_QUERY_KEY = ["app-config"] as const

export async function fetchAppConfig(): Promise<Omit<AppConfigRow, "id" | "updated_at">> {
  if (!isSupabaseConfigured()) return APP_CONFIG_FALLBACK
  const { data, error } = await getSupabaseBrowserClient()
    .from("app_config")
    .select("commission_rate, default_search_radius_km, hold_expiry_minutes")
    .eq("id", 1)
    .maybeSingle()
  if (error) return APP_CONFIG_FALLBACK
  if (!data) return APP_CONFIG_FALLBACK
  return data as Omit<AppConfigRow, "id" | "updated_at">
}

export function useAppConfig() {
  return useQuery({
    queryKey: APP_CONFIG_QUERY_KEY,
    queryFn: fetchAppConfig,
    staleTime: 5 * 60 * 1000,
  })
}

/** Hold lifetime in minutes, always sourced from `app_config`. */
export function useHoldExpiryMinutes(): number {
  const { data } = useAppConfig()
  return data?.hold_expiry_minutes ?? APP_CONFIG_FALLBACK.hold_expiry_minutes
}

/** Commission percentage, always sourced from `app_config`. */
export function useCommissionRate(): number {
  const { data } = useAppConfig()
  return data?.commission_rate ?? APP_CONFIG_FALLBACK.commission_rate
}

/** Default discovery radius in km, always sourced from `app_config`. */
export function useDefaultSearchRadiusKm(): number {
  const { data } = useAppConfig()
  return data?.default_search_radius_km ?? APP_CONFIG_FALLBACK.default_search_radius_km
}
