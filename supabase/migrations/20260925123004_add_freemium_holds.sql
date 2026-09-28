-- ==============================================================================
-- Migration: add_freemium_holds
-- Engine: PostgreSQL / Supabase
-- Description:
--   1. Adds subscription_tier to public.profiles ('free' | 'premium').
--   2. Creates public.hold_logs table to record historical slot holds.
--   3. Implements trigger to prevent non-admins from tampering with subscription_tier.
--   4. Updates hold_slot RPC with strict concurrency controls and freemium quota
--      enforcement (1 hold per 7 days for free users; unlimited for premium).
--   5. Establishes RLS policies for public.hold_logs.
--
-- Order of operations: Tables -> Functions & Triggers -> RLS Policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tables & Schema Updates
-- ------------------------------------------------------------------------------

-- 1.1 Add subscription_tier to public.profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
    CONSTRAINT chk_profiles_subscription_tier CHECK (subscription_tier IN ('free', 'premium'));

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- 1.2 Create public.hold_logs table
CREATE TABLE IF NOT EXISTS public.hold_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hold logs indexes for foreign keys and rapid query filtering
CREATE INDEX IF NOT EXISTS idx_hold_logs_user_id ON public.hold_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_hold_logs_slot_id ON public.hold_logs(slot_id);
CREATE INDEX IF NOT EXISTS idx_hold_logs_user_created_at ON public.hold_logs(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. Functions & Triggers
-- ------------------------------------------------------------------------------

-- 2.1 Security Trigger: Prevent users from self-promoting subscription_tier or role
CREATE OR REPLACE FUNCTION public.protect_profile_tier_and_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier OR NEW.role IS DISTINCT FROM OLD.role) THEN
        -- Allow updates if executed by postgres/admin, service_role (e.g. backend webhooks), or platform admin
        IF current_user NOT IN ('postgres', 'supabase_admin')
           AND COALESCE(auth.jwt()->>'role', '') <> 'service_role'
           AND NOT (SELECT public.is_admin()) THEN
            NEW.subscription_tier := OLD.subscription_tier;
            NEW.role := OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_tier_and_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_tier_and_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_tier_and_role();

-- 2.2 Core RPC: hold_slot with Concurrency Locking & Freemium Limit
CREATE OR REPLACE FUNCTION public.hold_slot(
    p_court_id UUID,
    p_date DATE,
    p_start_time TIME
)
RETURNS TABLE (
    slot_id UUID,
    held_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_slot_id UUID;
    v_held_until TIMESTAMPTZ;
    v_subscription_tier TEXT;
    v_hold_count INT;
BEGIN
    -- Step 1: Select the slot FOR UPDATE SKIP LOCKED.
    -- If not found (slot is booked, actively held, or non-existent), raise exception.
    -- CRITICAL: Locking the slot row first guarantees that concurrent requests
    -- competing for the exact same slot are serialized or skipped immediately.
    SELECT s.id
    INTO v_slot_id
    FROM public.slots s
    WHERE s.court_id = p_court_id
      AND s.date = p_date
      AND s.start_time = p_start_time
      AND (
          s.status = 'available'
          OR (s.status = 'held' AND s.held_until < now())
      )
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_slot_id IS NULL THEN
        RAISE EXCEPTION 'Slot is not available';
    END IF;

    -- Retrieve authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Step 2: Check the user's subscription_tier.
    -- Free users can only hold one slot per week (7 days); Premium users have unlimited holds.
    -- Lock profile FOR UPDATE to serialize multi-slot concurrent requests from the same user.
    SELECT p.subscription_tier
    INTO v_subscription_tier
    FROM public.profiles p
    WHERE p.id = v_user_id
    FOR UPDATE;

    IF COALESCE(v_subscription_tier, 'free') = 'free' THEN
        SELECT count(*)
        INTO v_hold_count
        FROM public.hold_logs
        WHERE user_id = v_user_id
          AND created_at > now() - INTERVAL '7 days';

        -- Step 3: If count >= 1, RAISE EXCEPTION 'freemium_limit_reached'.
        -- This automatically aborts and rolls back the transaction, releasing
        -- the slot lock acquired in Step 1 immediately.
        IF v_hold_count >= 1 THEN
            RAISE EXCEPTION 'freemium_limit_reached';
        END IF;
    END IF;

    -- Step 4: Execute the UPDATE on the slot (setting status to 'held').
    UPDATE public.slots
    SET status = 'held',
        held_by = v_user_id,
        held_until = now() + INTERVAL '5 minutes'
    WHERE id = v_slot_id
    RETURNING public.slots.held_until
    INTO v_held_until;

    -- Step 5: Execute the INSERT into hold_logs.
    INSERT INTO public.hold_logs (user_id, slot_id)
    VALUES (v_user_id, v_slot_id);

    -- Return the held slot details
    slot_id := v_slot_id;
    held_until := v_held_until;
    RETURN NEXT;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.hold_slot(UUID, DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hold_slot(UUID, DATE, TIME) TO anon;

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.hold_logs ENABLE ROW LEVEL SECURITY;

-- Admins: global access across all hold logs
CREATE POLICY "admin_all_hold_logs"
ON public.hold_logs
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Authenticated users: view own hold logs
CREATE POLICY "users_select_own_hold_logs"
ON public.hold_logs
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));
