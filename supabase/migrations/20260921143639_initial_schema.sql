-- ==============================================================================
-- Migration: Initial Schema
-- Blueprint: docs/SCHEMA.md
-- Engine: PostgreSQL / Supabase
-- Description: Core database structure including enums, tables, spatial types,
--              foreign key constraints, performance indices, and RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure Required Extensions
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ------------------------------------------------------------------------------
-- 2. Global Enums
-- ------------------------------------------------------------------------------

-- User roles across the platform
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'customer',
        'venue_owner',
        'venue_staff',
        'admin',
        'super_admin'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lifecycle states for a venue listing
DO $$ BEGIN
    CREATE TYPE public.venue_status AS ENUM (
        'draft',
        'submitted',
        'under_review',
        'approved',
        'published',
        'rejected',
        'suspended',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status states for pre-generated inventory slots
DO $$ BEGIN
    CREATE TYPE public.slot_status AS ENUM (
        'available',
        'held',
        'booked',
        'blocked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Booking reservation status states
DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM (
        'confirmed',
        'completed',
        'cancelled_by_customer',
        'cancelled_by_venue',
        'no_show'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status tracking for digital wallet transactions
DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM (
        'pending',
        'paid',
        'failed',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Media moderation status states
DO $$ BEGIN
    CREATE TYPE public.media_status AS ENUM (
        'pending',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Helper Functions
-- ------------------------------------------------------------------------------

-- Helper function to check admin privileges without triggering recursive RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
    );
$$;

-- Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Core Tables
-- ------------------------------------------------------------------------------

-- Table: profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role public.user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: venues
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    coordinates geography(Point, 4326) NOT NULL,
    area_id UUID,
    status public.venue_status NOT NULL DEFAULT 'draft',
    avg_rating NUMERIC NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: courts
CREATE TABLE IF NOT EXISTS public.courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    sport_id UUID,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: slots (Pre-generated bookable inventory)
CREATE TABLE IF NOT EXISTS public.slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status public.slot_status NOT NULL DEFAULT 'available',
    held_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    held_until TIMESTAMPTZ,
    CONSTRAINT uq_slots_court_date_start_time UNIQUE (court_id, date, start_time)
);

-- Table: bookings (Confirmed reservations and digital wallet tracking)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_ref TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
    court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
    status public.booking_status NOT NULL DEFAULT 'confirmed',
    payment_status public.payment_status NOT NULL DEFAULT 'pending',
    payment_gateway_ref TEXT,
    total_charged NUMERIC NOT NULL,
    venue_payout_amount NUMERIC NOT NULL,
    commission_amount_snapshot NUMERIC NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. Performance & Query Optimization Indexes
-- ------------------------------------------------------------------------------

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Venues indexes
CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON public.venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_venues_status ON public.venues(status);
CREATE INDEX IF NOT EXISTS idx_venues_area_id ON public.venues(area_id);
CREATE INDEX IF NOT EXISTS idx_venues_coordinates ON public.venues USING GIST(coordinates);

-- Courts indexes
CREATE INDEX IF NOT EXISTS idx_courts_venue_id ON public.courts(venue_id);
CREATE INDEX IF NOT EXISTS idx_courts_sport_id ON public.courts(sport_id);

-- Slots indexes
CREATE INDEX IF NOT EXISTS idx_slots_court_id ON public.slots(court_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.slots(date);
CREATE INDEX IF NOT EXISTS idx_slots_status ON public.slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_held_by ON public.slots(held_by);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_id ON public.bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON public.bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- ------------------------------------------------------------------------------
-- 6. Updated At Triggers
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_venues_updated_at ON public.venues;
CREATE TRIGGER set_venues_updated_at
    BEFORE UPDATE ON public.venues
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_courts_updated_at ON public.courts;
CREATE TRIGGER set_courts_updated_at
    BEFORE UPDATE ON public.courts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------

-- Enable RLS on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 8. Row Level Security Policies
-- ------------------------------------------------------------------------------

-- 8.1 PROFILES POLICIES
-- "Users can read/update their own profile; admins can read all."
DROP POLICY IF EXISTS "Users can read own profile or admins read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admins read all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = id
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 8.2 VENUES POLICIES
-- "Anonymous/Customers can read rows where status = 'published'. Owners/Staff can read/write their own venue."
DROP POLICY IF EXISTS "Anyone can read published venues or owners read own" ON public.venues;
CREATE POLICY "Anyone can read published venues or owners read own"
ON public.venues
FOR SELECT
TO public
USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND (owner_id = auth.uid() OR public.is_admin()))
);

DROP POLICY IF EXISTS "Owners can insert their own venues" ON public.venues;
CREATE POLICY "Owners can insert their own venues"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Owners can update their own venues" ON public.venues;
CREATE POLICY "Owners can update their own venues"
ON public.venues
FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    owner_id = auth.uid()
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Owners can delete their own venues" ON public.venues;
CREATE POLICY "Owners can delete their own venues"
ON public.venues
FOR DELETE
TO authenticated
USING (
    owner_id = auth.uid()
    OR public.is_admin()
);

-- 8.3 COURTS POLICIES
-- Courts follow parent venue visibility & owner access
DROP POLICY IF EXISTS "Anyone can view courts for published venues or owners" ON public.courts;
CREATE POLICY "Anyone can view courts for published venues or owners"
ON public.courts
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
          AND (venues.status = 'published' OR (auth.uid() IS NOT NULL AND (venues.owner_id = auth.uid() OR public.is_admin())))
    )
);

DROP POLICY IF EXISTS "Owners can insert courts for their venues" ON public.courts;
CREATE POLICY "Owners can insert courts for their venues"
ON public.courts
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
          AND (venues.owner_id = auth.uid() OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "Owners can update courts for their venues" ON public.courts;
CREATE POLICY "Owners can update courts for their venues"
ON public.courts
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
          AND (venues.owner_id = auth.uid() OR public.is_admin())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
          AND (venues.owner_id = auth.uid() OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "Owners can delete courts for their venues" ON public.courts;
CREATE POLICY "Owners can delete courts for their venues"
ON public.courts
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
          AND (venues.owner_id = auth.uid() OR public.is_admin())
    )
);

-- 8.4 SLOTS POLICIES
-- "Public read for published venues; writes strictly restricted to system jobs and atomic RPC functions."
DROP POLICY IF EXISTS "Public read for published venue slots" ON public.slots;
CREATE POLICY "Public read for published venue slots"
ON public.slots
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.courts
        JOIN public.venues ON venues.id = courts.venue_id
        WHERE courts.id = slots.court_id
          AND (venues.status = 'published' OR (auth.uid() IS NOT NULL AND (venues.owner_id = auth.uid() OR public.is_admin())))
    )
);
-- Note: Direct INSERT, UPDATE, and DELETE policies are intentionally omitted for public/authenticated roles.
-- Writes are strictly restricted to system jobs (service_role) and atomic SECURITY DEFINER RPC functions.

-- 8.5 BOOKINGS POLICIES
-- "Customers can read/insert their own bookings via secure RPCs; Venue owners/staff can read bookings tied to their venue."
DROP POLICY IF EXISTS "Customers and venue owners can view relevant bookings" ON public.bookings;
CREATE POLICY "Customers and venue owners can view relevant bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = bookings.venue_id
          AND venues.owner_id = auth.uid()
    )
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Customers can insert their own bookings" ON public.bookings;
CREATE POLICY "Customers can insert their own bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
    customer_id = auth.uid()
);
-- Note: Direct UPDATE and DELETE on bookings are intentionally omitted for clients.
-- Status transitions and settlement updates are executed strictly through atomic RPCs and webhook processors.
