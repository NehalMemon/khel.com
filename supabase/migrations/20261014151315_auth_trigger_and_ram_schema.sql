-- ==============================================================================
-- Migration: auth_trigger_and_ram_schema
-- Engine: PostgreSQL / Supabase
-- Description:
--   1. Add email column to profiles & make phone nullable
--   2. Create venue_team junction table for role & access management (RAM)
--   3. Create/update handle_new_user trigger function to populate profiles
--   4. Enable RLS on venue_team with owner management & self-view policies
-- Strict Order: Tables -> Functions & Triggers -> RLS Policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles Table Updates
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. Venue Team Junction Table (RAM)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_team (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(venue_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 3. Functions & Triggers
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Cast safely to the user_role enum
  BEGIN
    v_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      (NEW.raw_app_meta_data->>'role')::public.user_role,
      'customer'::public.user_role
    );
  EXCEPTION WHEN OTHERS THEN
    v_role := 'customer'::public.user_role;
  END;

  INSERT INTO public.profiles (id, role, name, email, phone)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 4. RLS Configuration & Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.venue_team ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage venue team" ON public.venue_team;
CREATE POLICY "Owners can manage venue team" 
  ON public.venue_team FOR ALL USING (
    EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_team.venue_id AND v.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Team members can view their own permissions" ON public.venue_team;
CREATE POLICY "Team members can view their own permissions" 
  ON public.venue_team FOR SELECT USING (user_id = auth.uid());
