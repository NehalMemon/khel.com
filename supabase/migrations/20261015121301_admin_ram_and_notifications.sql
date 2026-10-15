-- 1. Admin RAM: Add platform_permissions to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS platform_permissions jsonb DEFAULT '[]'::jsonb;

-- 2. Create Notifications Table
CREATE TYPE public.notification_type AS ENUM ('booking_confirmed', 'booking_cancelled', 'application_approved', 'application_rejected', 'system_alert');

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_link text, -- Optional URL to redirect when clicked
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Enable RLS on Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read and update their own notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Only the system (Service Role) can insert notifications, so no INSERT policy for authenticated users is needed.
