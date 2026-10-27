CREATE OR REPLACE FUNCTION public.get_available_time_chips(
    p_venue_id   UUID,
    p_category   TEXT,
    p_target_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_interval_minutes INT := 30; -- Defaulting to 30; can be made dynamic per resource later
    v_day_name TEXT;
    v_operating JSONB;
    v_slot_start TIME;
    v_slot_end   TIME;
    v_slot_ts_start TIMESTAMP;
    v_slot_ts_end   TIMESTAMP;
    v_total_units INT;
    v_unavailable_units INT;
    v_result JSONB := '[]'::JSONB;
BEGIN
    -- 1. Resolve day name (lowercase, e.g., 'monday')
    SELECT lower(trim(to_char(p_target_date, 'Day'))) INTO v_day_name;

    -- 2. Extract operating hours JSON object for that day
    SELECT operating_hours -> v_day_name
      INTO v_operating
      FROM venues
     WHERE id = p_venue_id;

    -- If closed or not defined, return empty array
    IF v_operating IS NULL OR (v_operating->>'open') IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;

    v_slot_start := (v_operating->>'open')::TIME;
    v_slot_end   := (v_operating->>'close')::TIME;

    -- 3. Total resources of the given category for the venue
    SELECT COUNT(*)
      INTO v_total_units
      FROM resources r
     WHERE r.venue_id = p_venue_id
       AND r.category = p_category;

    -- 4. Generate time chips within this period using generate_series
    FOR v_slot_ts_start IN
        SELECT (p_target_date + gs)::TIMESTAMP
        FROM generate_series(
            v_slot_start,
            v_slot_end - make_interval(mins => v_interval_minutes),
            make_interval(mins => v_interval_minutes)
        ) AS gs
    LOOP
        v_slot_ts_end := v_slot_ts_start + make_interval(mins => v_interval_minutes);

        -- 5. Determine unavailable resources respecting hierarchy (No category filter yet)
        WITH booked AS (
            SELECT b.resource_id
            FROM bookings b
            JOIN resources r ON r.id = b.resource_id
            WHERE r.venue_id = p_venue_id
              AND b.start_time < v_slot_ts_end
              AND b.end_time   > v_slot_ts_start
        ),
        descendants AS (
            SELECT child.id
            FROM resources child
            JOIN booked b ON child.parent_id = b.resource_id
        ),
        ancestors AS (
            SELECT parent.id
            FROM resources parent
            JOIN resources child ON child.parent_id = parent.id
            WHERE child.id IN (SELECT resource_id FROM booked)
        ),
        unavailable AS (
            SELECT DISTINCT id FROM (
                SELECT resource_id AS id FROM booked
                UNION SELECT id FROM descendants
                UNION SELECT id FROM ancestors
            ) u
        )
        -- NOW filter the unavailable units to only count the requested category
        SELECT COUNT(*) INTO v_unavailable_units 
        FROM unavailable u
        JOIN resources r ON r.id = u.id
        WHERE r.category = p_category;

        -- 6. Compute available inventory for this chip
        v_result := v_result || jsonb_build_object(
            'time', to_char(v_slot_ts_start, 'HH24:MI'),
            'available_inventory', GREATEST(v_total_units - v_unavailable_units, 0)
        );
    END LOOP;

    RETURN v_result;
END;
$$;
