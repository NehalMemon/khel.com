-- 1. Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the cleanup function
CREATE OR REPLACE FUNCTION public.release_expired_holds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.slots
  SET status = 'available'::slot_status,
      held_by = NULL,
      held_until = NULL
  WHERE status = 'held'::slot_status 
    AND held_until < now();
END;
$$;

-- 3. Schedule the function to run every minute
-- We use a unique job name so it can be updated or unscheduled later if needed
SELECT cron.schedule(
  'release-expired-holds-job', 
  '* * * * *', 
  'SELECT public.release_expired_holds();'
);
