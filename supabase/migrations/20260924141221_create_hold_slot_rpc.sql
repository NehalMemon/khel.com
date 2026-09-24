-- ==============================================================================
-- Migration: create_hold_slot_rpc
-- Engine: PostgreSQL / Supabase
-- Description: RPC for atomic slot reservations with high-concurrency locking
--              (FOR UPDATE SKIP LOCKED) and automatic stale hold resolution.
-- Order of operations: Functions -> Grants
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Function: public.hold_slot
-- ------------------------------------------------------------------------------
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
    v_slot_id UUID;
    v_held_until TIMESTAMPTZ;
BEGIN
    -- Perform atomic update with a subquery using FOR UPDATE SKIP LOCKED
    -- to prevent race conditions during high-traffic checkout flows.
    UPDATE public.slots
    SET status = 'held',
        held_by = auth.uid(),
        held_until = now() + INTERVAL '5 minutes'
    WHERE id = (
        SELECT s.id
        FROM public.slots s
        WHERE s.court_id = p_court_id
          AND s.date = p_date
          AND s.start_time = p_start_time
          AND (
              s.status = 'available'
              OR (s.status = 'held' AND s.held_until < now())
          )
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING id, public.slots.held_until
    INTO v_slot_id, v_held_until;

    -- If no row was updated (slot is booked, active held by someone else, or doesn't exist), abort transaction
    IF v_slot_id IS NULL THEN
        RAISE EXCEPTION 'Slot is not available';
    END IF;

    slot_id := v_slot_id;
    held_until := v_held_until;
    RETURN NEXT;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.hold_slot(UUID, DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hold_slot(UUID, DATE, TIME) TO anon;
