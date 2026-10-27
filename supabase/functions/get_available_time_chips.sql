/*
  Function: get_available_time_chips
  Description:
    Dynamically calculates available time intervals (chips) for a given venue,
    category, and target date without relying on a pre‑generated slots table.
    It respects the venue's operating_hours, the interval step defined in the
    venue's metadata, and hierarchical booking conflicts (parent/child resources).

  Parameters:
    p_venue_id   UUID   – The venue identifier.
    p_category   TEXT   – Resource category (e.g., 'room', 'pc').
    p_target_date DATE  – The date for which availability is requested.

  Returns:
    JSONB – Array of objects [{"time":"HH:MI","available_inventory":int}, ...]
*/
CREATE OR REPLACE FUNCTION public.get_available_time_chips(
    p_venue_id   UUID,
    p_category   TEXT,
    p_target_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_interval_minutes INT;
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
    -- 1. Determine interval step from venue metadata (default 30 minutes)
    SELECT COALESCE((metadata->>'interval_step')::INT, 30)
      INTO v_interval_minutes
      FROM venues
     WHERE id = p_venue_id;

    -- 2. Resolve day name (lowercase, e.g., 'monday')
    SELECT lower(trim(to_char(p_target_date, 'Day'))) INTO v_day_name;

    -- 3. Extract operating hours JSON array for that day
    SELECT operating_hours -> v_day_name
      INTO v_operating
      FROM venues
     WHERE id = p_venue_id;

    IF v_operating IS NULL OR jsonb_array_length(v_operating) = 0 THEN
        RETURN '[]'::JSONB; -- venue closed on this day
    END IF;

    -- 4. Total resources of the given category for the venue
    SELECT COUNT(*)
      INTO v_total_units
      FROM resources r
     WHERE r.venue_id = p_venue_id
       AND r.category = p_category;

    -- 5. Iterate over each operating period for the day
    FOR v_slot_start, v_slot_end IN
        SELECT
            (ele->>'open')::TIME AS open_time,
            (ele->>'close')::TIME AS close_time
        FROM jsonb_array_elements(v_operating) AS arr(ele)
    LOOP
        -- Generate time chips within this period using generate_series
        FOR v_slot_ts_start IN
            SELECT (p_target_date + gs)::TIMESTAMP
            FROM generate_series(
                v_slot_start,
                v_slot_end - make_interval(mins => v_interval_minutes),
                make_interval(mins => v_interval_minutes)
            ) AS gs
        LOOP
            v_slot_ts_end := v_slot_ts_start + make_interval(mins => v_interval_minutes);

            -- Determine unavailable resources for this slot respecting hierarchy
            WITH booked AS (
                SELECT b.resource_id
                FROM bookings b
                JOIN resources r ON r.id = b.resource_id
                WHERE r.venue_id = p_venue_id
                  AND r.category = p_category
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
            SELECT COUNT(*) INTO v_unavailable_units FROM unavailable;

            -- Compute available inventory for this chip
            v_result := v_result || jsonb_build_object(
                'time', to_char(v_slot_ts_start, 'HH24:MI'),
                'available_inventory', GREATEST(v_total_units - v_unavailable_units, 0)
            );
        END LOOP;
    END LOOP;

    RETURN v_result;
END;
$$;
