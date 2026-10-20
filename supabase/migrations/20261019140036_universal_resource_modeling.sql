-- 1. Rename 'courts' to 'resources' to reflect multi-vertical nature
ALTER TABLE public.courts RENAME TO resources;

-- 2. Update Resource columns for Adjacency List (Hierarchy) & Taxonomy
ALTER TABLE public.resources RENAME COLUMN sport_type TO category;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.resources(id) ON DELETE CASCADE;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
-- Ensure metadata exists to hold pricing_rules, capacity, booking_model
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 3. Update Venues for Dynamic Availability & SaaS Tiers
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{"monday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "10:00", "close": "22:00"}, "wednesday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "10:00", "close": "22:00"}, "friday": {"open": "10:00", "close": "22:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "sunday": {"open": "10:00", "close": "22:00"}}'::jsonb;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS max_advance_booking_days integer DEFAULT 14;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'basic';

-- 4. Update Bookings for Dynamic Scheduling (Deprecating slot_id)
ALTER TABLE public.bookings RENAME COLUMN court_id TO resource_id;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;

-- Note: We are keeping the legacy slot_id column temporarily for rollback safety, but all new bookings must use start_time, end_time, and resource_id.
