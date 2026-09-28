-- ==============================================================================
-- Migration: create_app_config
-- Engine: PostgreSQL / Supabase
-- Description:
--   Creates a singleton app_config table to store dynamic, platform-wide
--   configuration parameters (commission rates, search radiuses, hold durations).
--
-- Order of operations: Tables & Seed -> Functions/Triggers -> RLS Policies & Grants
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: public.app_config
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_config (
    id INT PRIMARY KEY CHECK (id = 1),
    commission_rate NUMERIC NOT NULL DEFAULT 0.00,
    default_search_radius_km INT NOT NULL DEFAULT 10,
    hold_expiry_minutes INT NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed singleton initial configuration row
INSERT INTO public.app_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Trigger to automatically maintain updated_at on updates
DROP TRIGGER IF EXISTS set_app_config_updated_at ON public.app_config;
CREATE TRIGGER set_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 2.1 SELECT policy: allow both anon and authenticated roles to read configuration
CREATE POLICY "allow_read_app_config"
ON public.app_config
FOR SELECT
TO anon, authenticated
USING (true);

-- 2.2 UPDATE policy: strictly restricted to platform admins via public.is_admin()
-- Note: INSERT and DELETE remain completely blocked under default-deny posture.
CREATE POLICY "admin_update_app_config"
ON public.app_config
FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- ------------------------------------------------------------------------------
-- 3. Data API Grants
-- ------------------------------------------------------------------------------

GRANT SELECT ON TABLE public.app_config TO anon, authenticated;
GRANT UPDATE ON TABLE public.app_config TO authenticated;
