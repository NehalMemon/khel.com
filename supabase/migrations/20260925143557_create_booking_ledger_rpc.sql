-- ==============================================================================
-- Migration: create_booking_ledger_rpc
-- Engine: PostgreSQL / Supabase
-- Description:
--   Creates the public.confirm_booking_with_payment RPC for processing payment
--   gateway webhooks, calculating commission and venue payouts from dynamic
--   platform configuration, and atomically finalizing booking & slot states.
--
-- Order of operations: Functions -> Permissions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Function: public.confirm_booking_with_payment
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_booking_with_payment(
    p_booking_id UUID,
    p_gateway_ref TEXT,
    p_amount_paid NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_slot_id UUID;
    v_payment_status public.payment_status;
    v_booking_ref TEXT;
    v_commission_rate NUMERIC;
    v_commission_amount NUMERIC;
    v_venue_payout NUMERIC;
BEGIN
    -- Security defense-in-depth: Ensure caller is service_role, postgres, or platform admin
    IF current_user NOT IN ('postgres', 'supabase_admin') 
       AND COALESCE(auth.jwt()->>'role', '') <> 'service_role' 
       AND NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized: only payment webhooks can confirm bookings';
    END IF;

    -- Logic - Step 1: Select the slot_id from the booking.
    -- Use FOR UPDATE to prevent race conditions during concurrent webhook deliveries.
    -- If the booking is already paid, RAISE EXCEPTION 'Booking already paid'.
    SELECT b.slot_id, b.payment_status, b.booking_ref
    INTO v_slot_id, v_payment_status, v_booking_ref
    FROM public.bookings b
    WHERE b.id = p_booking_id
    FOR UPDATE;

    IF v_payment_status IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_payment_status = 'paid' THEN
        RAISE EXCEPTION 'Booking already paid';
    END IF;

    -- Logic - Step 2: Fetch the live commission_rate from public.app_config where id = 1.
    SELECT commission_rate
    INTO v_commission_rate
    FROM public.app_config
    WHERE id = 1;

    IF v_commission_rate IS NULL THEN
        v_commission_rate := 0.00;
    END IF;

    -- Logic - Step 3: Calculate the v_commission_amount (p_amount_paid * commission_rate / 100)
    -- and the v_venue_payout (p_amount_paid - v_commission_amount).
    v_commission_amount := ROUND((p_amount_paid * v_commission_rate / 100.0), 2);
    v_venue_payout := p_amount_paid - v_commission_amount;

    -- Logic - Step 4: Update the bookings table: set status = 'confirmed', payment_status = 'paid',
    -- payment_gateway_ref = p_gateway_ref, total_charged = p_amount_paid,
    -- commission_amount_snapshot = v_commission_amount, and venue_payout_amount = v_venue_payout.
    UPDATE public.bookings
    SET status = 'confirmed',
        payment_status = 'paid',
        payment_gateway_ref = p_gateway_ref,
        total_charged = p_amount_paid,
        commission_amount_snapshot = v_commission_amount,
        venue_payout_amount = v_venue_payout,
        updated_at = now()
    WHERE id = p_booking_id;

    -- Logic - Step 5: Update the slots table: set status = 'booked' where id = v_slot_id.
    IF v_slot_id IS NOT NULL THEN
        UPDATE public.slots
        SET status = 'booked'
        WHERE id = v_slot_id;
    END IF;

    RETURN v_booking_ref;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Execution Permissions
-- ------------------------------------------------------------------------------

-- Allow execution by service_role (Edge Functions) and authenticated roles
-- (defense-in-depth inside function ensures non-service/non-admin cannot forge payments)
GRANT EXECUTE ON FUNCTION public.confirm_booking_with_payment(UUID, TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_booking_with_payment(UUID, TEXT, NUMERIC) TO authenticated;
