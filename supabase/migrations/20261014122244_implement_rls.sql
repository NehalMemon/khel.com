-- 1. Enable RLS on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 2. App Config Policies
-- Everyone can read the config, no one can write via API
CREATE POLICY "App config is viewable by everyone" 
  ON public.app_config FOR SELECT USING (true);

-- 3. Profiles Policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Venue owners can view profiles of their customers" 
  ON public.profiles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.venues v ON b.venue_id = v.id
      WHERE b.customer_id = profiles.id AND v.owner_id = auth.uid()
    )
  );

-- 4. Venues Policies
CREATE POLICY "Published venues are viewable by everyone" 
  ON public.venues FOR SELECT USING (status = 'published'::venue_status);
CREATE POLICY "Owners can view all their venues" 
  ON public.venues FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their own venues" 
  ON public.venues FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own venues" 
  ON public.venues FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their own venues" 
  ON public.venues FOR DELETE USING (auth.uid() = owner_id);

-- 5. Courts Policies
CREATE POLICY "Courts of published venues are viewable by everyone" 
  ON public.courts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.venues v WHERE v.id = courts.venue_id AND v.status = 'published'::venue_status)
  );
CREATE POLICY "Owners can manage courts" 
  ON public.courts ALL USING (
    EXISTS (SELECT 1 FROM public.venues v WHERE v.id = courts.venue_id AND v.owner_id = auth.uid())
  );

-- 6. Slots Policies
CREATE POLICY "Slots of published venues are viewable by everyone" 
  ON public.slots FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courts c JOIN public.venues v ON c.venue_id = v.id WHERE c.id = slots.court_id AND v.status = 'published'::venue_status)
  );
CREATE POLICY "Owners can manage slots" 
  ON public.slots ALL USING (
    EXISTS (SELECT 1 FROM public.courts c JOIN public.venues v ON c.venue_id = v.id WHERE c.id = slots.court_id AND v.owner_id = auth.uid())
  );

-- 7. Bookings Policies
CREATE POLICY "Customers can view their own bookings" 
  ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can insert bookings" 
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Owners can view bookings for their venues" 
  ON public.bookings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.venues v WHERE v.id = bookings.venue_id AND v.owner_id = auth.uid())
  );
CREATE POLICY "Owners can update their venue bookings" 
  ON public.bookings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.venues v WHERE v.id = bookings.venue_id AND v.owner_id = auth.uid())
  );

-- 8. Security Trigger: Prevent Owners/Customers from editing financial data on Bookings
CREATE OR REPLACE FUNCTION public.restrict_booking_financial_updates()
RETURNS trigger AS $$
BEGIN
  -- If the payload attempts to change money/status columns, reject it.
  IF OLD.total_charged IS DISTINCT FROM NEW.total_charged OR
     OLD.payment_status IS DISTINCT FROM NEW.payment_status OR
     OLD.venue_payout_amount IS DISTINCT FROM NEW.venue_payout_amount THEN
     RAISE EXCEPTION 'Not authorized to modify financial records. Contact system admin.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger ONLY to standard authenticated users (allows Edge Functions using Service Role to still update payments)
CREATE TRIGGER enforce_financial_security
BEFORE UPDATE ON public.bookings
FOR EACH ROW
WHEN (current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated')
EXECUTE FUNCTION public.restrict_booking_financial_updates();