-- ==============================================================================
-- Migration: create_nearby_venues_rpc
-- Engine: PostgreSQL / PostGIS / Supabase
-- Description:
--   Creates the public.search_venues_nearby PostGIS discovery RPC for querying
--   published venues within a given radius (km) of user coordinates.
--
-- Order of operations: Indexes -> Functions -> Permissions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Spatial Indexes
-- ------------------------------------------------------------------------------

-- Ensure GiST spatial index exists on venues(coordinates) for ST_DWithin performance
CREATE INDEX IF NOT EXISTS idx_venues_coordinates ON public.venues USING GIST(coordinates);

-- ------------------------------------------------------------------------------
-- 2. Function: public.search_venues_nearby
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_venues_nearby(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    address TEXT,
    avg_rating NUMERIC,
    amenities JSONB,
    images JSONB,
    distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    user_geo geography;
BEGIN
    -- Construct the user's location Point with strict longitude-first order (p_lon, p_lat)
    user_geo := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        v.id,
        v.name,
        v.slug,
        v.address,
        v.avg_rating,
        v.amenities,
        COALESCE(v.amenities->'images', '[]'::jsonb) AS images,
        (ST_Distance(v.coordinates, user_geo) / 1000.0)::DOUBLE PRECISION AS distance_km
    FROM public.venues v
    WHERE v.status = 'published'
      AND ST_DWithin(v.coordinates, user_geo, p_radius_km * 1000.0)
    ORDER BY distance_km ASC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Execution Permissions
-- ------------------------------------------------------------------------------

-- Public marketplace discovery: accessible to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.search_venues_nearby(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_venues_nearby(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;
