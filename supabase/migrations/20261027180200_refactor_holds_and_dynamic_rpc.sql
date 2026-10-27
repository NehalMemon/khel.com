-- ==============================================================================
-- Migration: refactor_holds_and_dynamic_rpc
-- Description:
--   1. Alter public.hold_logs to support Universal Resource Architecture:
--      - Drop slot_id column and foreign key
--      - Add resource_id (UUID NOT NULL REFERENCES public.resources(id))
--      - Add start_time (TIMESTAMPTZ NOT NULL) and end_time (TIMESTAMPTZ NOT NULL)
--   2. Implement dynamic composite holding RPC hold_resource_time with
--      concurrency locking, expiry checks via app_config, and Adjacency List hierarchy.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Alter public.hold_logs
-- ------------------------------------------------------------------------------

-- Drop previous slot-based index and foreign key / column if they exist
DROP INDEX IF EXISTS public.idx_hold_logs_slot_id;

ALTER TABLE public.hold_logs
    DROP COLUMN IF EXISTS slot_id CASCADE;

ALTER TABLE public.hold_logs
    ADD COLUMN IF NOT EXISTS resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '1 hour';

-- Indexes for resource and time range lookups
CREATE INDEX IF NOT EXISTS idx_hold_logs_resource_id ON public.hold_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_hold_logs_time_range ON public.hold_logs(resource_id, start_time, end_time);

-- ------------------------------------------------------------------------------
-- 2. Dynamic Slot Holding RPC: hold_resource_time
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hold_resource_time(
    p_resource_id UUID,
    p_user_id     UUID,
    p_start_time  TIMESTAMPTZ,
    p_end_time    TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hold_id UUID;
    v_expiry_minutes INT := 5;
    v_venue_id UUID;
    v_conflict_count INT := 0;
    v_caller_id UUID;
BEGIN
    -- Verify authentication/caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND v_caller_id <> p_user_id AND NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized hold attempt';
    END IF;

    -- Validate input timestamps
    IF p_start_time >= p_end_time THEN
        RAISE EXCEPTION 'Invalid time window: start_time must be before end_time';
    END IF;

    -- Retrieve hold expiry minutes from app_config singleton (id = 1)
    SELECT COALESCE(hold_expiry_minutes, 5)
    INTO v_expiry_minutes
    FROM public.app_config
    WHERE id = 1;

    -- Lock the target resource row FOR UPDATE to serialize concurrent hold requests
    -- on the same resource or its hierarchy
    SELECT venue_id
    INTO v_venue_id
    FROM public.resources
    WHERE id = p_resource_id
    FOR UPDATE;

    IF v_venue_id IS NULL THEN
        RAISE EXCEPTION 'Resource not found';
    END IF;

    -- Adjacency list tree: get target resource, its parent (ancestor), and all children (descendants)
    WITH related_resources AS (
        -- Target resource itself
        SELECT p_resource_id AS id
        UNION
        -- Direct parent (if target is a child)
        SELECT parent_id AS id
        FROM public.resources
        WHERE id = p_resource_id AND parent_id IS NOT NULL
        UNION
        -- Direct children (if target is a parent)
        SELECT id
        FROM public.resources
        WHERE parent_id = p_resource_id
    ),
    active_bookings AS (
        SELECT b.id
        FROM public.bookings b
        JOIN related_resources rr ON rr.id = b.resource_id
        WHERE b.status = 'confirmed'
          AND b.start_time < p_end_time
          AND b.end_time > p_start_time
    ),
    active_holds AS (
        SELECT h.id
        FROM public.hold_logs h
        JOIN related_resources rr ON rr.id = h.resource_id
        WHERE h.created_at > (now() - make_interval(mins => v_expiry_minutes))
          AND h.start_time < p_end_time
          AND h.end_time > p_start_time
    )
    SELECT (SELECT COUNT(*) FROM active_bookings) + (SELECT COUNT(*) FROM active_holds)
    INTO v_conflict_count;

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Resource time slot is not available';
    END IF;

    -- Insert active hold record into hold_logs
    INSERT INTO public.hold_logs (
        user_id,
        resource_id,
        start_time,
        end_time,
        created_at
    )
    VALUES (
        p_user_id,
        p_resource_id,
        p_start_time,
        p_end_time,
        now()
    )
    RETURNING id INTO v_hold_id;

    RETURN v_hold_id;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.hold_resource_time(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hold_resource_time(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

