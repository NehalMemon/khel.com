-- ==============================================================================
-- Migration: sync_auth_users_to_profiles
-- Engine: PostgreSQL / Supabase
-- Description: Automatically mirror new signups from auth.users to public.profiles
-- Order of operations: Function -> Trigger
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Function: public.handle_new_user()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role_val public.user_role;
    user_name TEXT;
    user_phone TEXT;
    user_avatar TEXT;
BEGIN
    -- Map role: extract from raw_user_meta_data->>'role', safely cast to enum, default to 'customer'
    user_role_val := CASE 
        WHEN NEW.raw_user_meta_data->>'role' IN ('customer', 'venue_owner', 'venue_staff', 'admin', 'super_admin') 
        THEN (NEW.raw_user_meta_data->>'role')::public.user_role
        ELSE 'customer'::public.user_role
    END;

    -- Map name: extract from raw_user_meta_data->>'name', falling back to 'Unknown'
    user_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        'Unknown'
    );

    -- Map phone: extract from NEW.phone or raw_user_meta_data->>'phone'
    -- Crucial constraint handling: phone is NOT NULL and UNIQUE in public.profiles.
    -- If no phone is provided (e.g. email signups), fall back to 'pending-' || NEW.id
    user_phone := COALESCE(
        NULLIF(TRIM(NEW.phone), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        'pending-' || NEW.id::text
    );

    -- Map avatar_url: extract from raw_user_meta_data->>'avatar_url'
    user_avatar := NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), '');

    -- Insert new row into public.profiles
    INSERT INTO public.profiles (
        id,
        name,
        phone,
        avatar_url,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        user_name,
        user_phone,
        user_avatar,
        user_role_val,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Trigger: on_auth_user_created on auth.users
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
