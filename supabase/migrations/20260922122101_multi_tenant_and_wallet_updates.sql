-- ==============================================================================
-- Migration: multi_tenant_and_wallet_updates
-- Blueprint: docs/SCHEMA.md
-- Order of operations: Enums -> Tables -> RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enums
-- ------------------------------------------------------------------------------

-- Ensure all enum types exist and add any new values
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('customer', 'venue_owner', 'venue_staff', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.venue_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'published', 'rejected', 'suspended', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.slot_status AS ENUM ('available', 'held', 'booked', 'blocked', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE public.slot_status ADD VALUE IF NOT EXISTS 'maintenance';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM ('confirmed', 'completed', 'cancelled_by_customer', 'cancelled_by_venue', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.media_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Tables & Column Updates
-- ------------------------------------------------------------------------------

-- 2.1 Profiles updates
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'customer',
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2.2 Venues updates
ALTER TABLE public.venues 
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS area_id UUID,
    ADD COLUMN IF NOT EXISTS status public.venue_status NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS avg_rating NUMERIC NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2.3 Courts updates
ALTER TABLE public.courts 
    ADD COLUMN IF NOT EXISTS sport_type TEXT,
    ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2.4 Bookings updates
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES public.courts(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS payment_gateway_ref TEXT,
    ADD COLUMN IF NOT EXISTS total_charged NUMERIC NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS venue_payout_amount NUMERIC NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS commission_amount_snapshot NUMERIC NOT NULL DEFAULT 0.00;

-- Additional foreign key indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_venues_amenities ON public.venues USING GIN(amenities);
CREATE INDEX IF NOT EXISTS idx_courts_metadata ON public.courts USING GIN(metadata);

-- ------------------------------------------------------------------------------
-- 3. Row-Level Security (RLS) Policies (Section 4 of SCHEMA.md)
-- ------------------------------------------------------------------------------

-- 3.1 Drop legacy policies
DROP POLICY IF EXISTS "Users can read own profile or admins read all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can read published venues or owners read own" ON public.venues;
DROP POLICY IF EXISTS "Owners can insert their own venues" ON public.venues;
DROP POLICY IF EXISTS "Owners can update their own venues" ON public.venues;
DROP POLICY IF EXISTS "Owners can delete their own venues" ON public.venues;
DROP POLICY IF EXISTS "admin_all_venues" ON public.venues;
DROP POLICY IF EXISTS "public_select_published_venues" ON public.venues;
DROP POLICY IF EXISTS "owners_select_own_venues" ON public.venues;
DROP POLICY IF EXISTS "owners_insert_own_venues" ON public.venues;
DROP POLICY IF EXISTS "owners_update_own_venues" ON public.venues;
DROP POLICY IF EXISTS "owners_delete_own_venues" ON public.venues;

DROP POLICY IF EXISTS "Anyone can view courts for published venues or owners" ON public.courts;
DROP POLICY IF EXISTS "Owners can insert courts for their venues" ON public.courts;
DROP POLICY IF EXISTS "Owners can update courts for their venues" ON public.courts;
DROP POLICY IF EXISTS "Owners can delete courts for their venues" ON public.courts;
DROP POLICY IF EXISTS "admin_all_courts" ON public.courts;
DROP POLICY IF EXISTS "public_select_published_venue_courts" ON public.courts;
DROP POLICY IF EXISTS "owners_manage_own_venue_courts" ON public.courts;

DROP POLICY IF EXISTS "Public read for published venue slots" ON public.slots;
DROP POLICY IF EXISTS "admin_all_slots" ON public.slots;
DROP POLICY IF EXISTS "public_select_published_venue_slots" ON public.slots;
DROP POLICY IF EXISTS "owners_manage_own_venue_slots" ON public.slots;

DROP POLICY IF EXISTS "Customers and venue owners can view relevant bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can insert their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin_all_bookings" ON public.bookings;
DROP POLICY IF EXISTS "customers_select_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "customers_insert_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "owners_select_own_venue_bookings" ON public.bookings;
DROP POLICY IF EXISTS "owners_update_own_venue_bookings" ON public.bookings;

-- 3.2 PROFILES POLICIES
-- Admins bypass all tenant constraints
CREATE POLICY "admin_all_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- All users: SELECT & UPDATE own profile
CREATE POLICY "users_select_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "users_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "users_insert_own_profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- 3.3 VENUES POLICIES
-- Admins bypass all tenant constraints
CREATE POLICY "admin_all_venues"
ON public.venues
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Customers / Anonymous: SELECT published venues
CREATE POLICY "public_select_published_venues"
ON public.venues
FOR SELECT
TO public
USING (status = 'published');

-- Venue Owners: SELECT, INSERT, UPDATE, DELETE rows where owner_id = auth.uid()
CREATE POLICY "owners_select_own_venues"
ON public.venues
FOR SELECT
TO authenticated
USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "owners_insert_own_venues"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "owners_update_own_venues"
ON public.venues
FOR UPDATE
TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "owners_delete_own_venues"
ON public.venues
FOR DELETE
TO authenticated
USING (owner_id = (SELECT auth.uid()));

-- 3.4 COURTS POLICIES
-- Admins bypass all tenant constraints
CREATE POLICY "admin_all_courts"
ON public.courts
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Customers / Anonymous: SELECT rows linked to published venue
CREATE POLICY "public_select_published_venue_courts"
ON public.courts
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
          AND venues.status = 'published'
    )
);

-- Venue Owners: SELECT, INSERT, UPDATE, DELETE rows where parent venue.owner_id = auth.uid()
CREATE POLICY "owners_manage_own_venue_courts"
ON public.courts
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
          AND venues.owner_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
          AND venues.owner_id = (SELECT auth.uid())
    )
);

-- 3.5 SLOTS POLICIES
-- Admins bypass all tenant constraints
CREATE POLICY "admin_all_slots"
ON public.slots
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Customers / Anonymous: SELECT rows linked to published venue
CREATE POLICY "public_select_published_venue_slots"
ON public.slots
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.courts
        JOIN public.venues ON venues.id = courts.venue_id
        WHERE courts.id = slots.court_id
          AND venues.status = 'published'
    )
);

-- Venue Owners: SELECT, INSERT, UPDATE, DELETE rows where parent venue.owner_id = auth.uid()
CREATE POLICY "owners_manage_own_venue_slots"
ON public.slots
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courts
        JOIN public.venues ON venues.id = courts.venue_id
        WHERE courts.id = slots.court_id
          AND venues.owner_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.courts
        JOIN public.venues ON venues.id = courts.venue_id
        WHERE courts.id = slots.court_id
          AND venues.owner_id = (SELECT auth.uid())
    )
);

-- 3.6 BOOKINGS POLICIES
-- Admins bypass all tenant constraints
CREATE POLICY "admin_all_bookings"
ON public.bookings
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Customers: SELECT and INSERT rows where customer_id = auth.uid()
CREATE POLICY "customers_select_own_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (customer_id = (SELECT auth.uid()));

CREATE POLICY "customers_insert_own_bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (customer_id = (SELECT auth.uid()));

-- Venue Owners: SELECT and UPDATE rows where denormalized venue_id links back to a venue they own
CREATE POLICY "owners_select_own_venue_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = bookings.venue_id
          AND venues.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "owners_update_own_venue_bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = bookings.venue_id
          AND venues.owner_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = bookings.venue_id
          AND venues.owner_id = (SELECT auth.uid())
    )
);
