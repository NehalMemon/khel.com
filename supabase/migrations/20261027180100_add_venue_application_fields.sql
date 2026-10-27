-- ==============================================================================
-- Migration: add_venue_application_fields
-- Description:
--   Add optional primary_category and description fields to public.venue_applications
-- ==============================================================================

ALTER TABLE public.venue_applications
    ADD COLUMN IF NOT EXISTS primary_category TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT;

