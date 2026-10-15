-- 1. Create the application status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Create the venue_applications table
CREATE TABLE public.venue_applications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    applicant_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    venue_name text NOT NULL,
    venue_address text NOT NULL,
    status public.application_status DEFAULT 'pending'::public.application_status NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.venue_applications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow anyone (public/anon or logged in) to submit an application
CREATE POLICY "Anyone can submit an application" 
  ON public.venue_applications FOR INSERT WITH CHECK (true);

-- Restrict read access to Admins only
CREATE POLICY "Admins can view applications" 
  ON public.venue_applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::public.user_role)
  );

-- Restrict update access to Admins only
CREATE POLICY "Admins can update applications" 
  ON public.venue_applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::public.user_role)
  );
