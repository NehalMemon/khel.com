-- supabase/seed.sql

-- --------------------------------------------------------
-- 0. Auth Users (Required to satisfy profiles.id -> auth.users.id FK)
-- --------------------------------------------------------
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@khel.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Khel Admin"}',
    now(),
    now()
),
(
    '00000000-0000-0000-0000-000000000000',
    'b0000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'owner@khel.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Bahadurabad Sports Manager"}',
    now(),
    now()
),
(
    '00000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'customer@khel.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Test Player"}',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- 1. Profiles (Hardcoded UUIDs for relational mapping)
-- --------------------------------------------------------
INSERT INTO public.profiles (id, role, name, phone, avatar_url, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin', 'Khel Admin', '+923000000001', null, now(), now()),
  ('b0000000-0000-0000-0000-000000000002', 'venue_owner', 'Bahadurabad Sports Manager', '+923000000002', null, now(), now()),
  ('c0000000-0000-0000-0000-000000000003', 'customer', 'Test Player', '+923000000003', null, now(), now())
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- 2. Venues (PostGIS coordinates for Karachi)
-- Note: UUIDs must be hexadecimal (0-9, a-f), so d100... / d200... is used in place of non-hex v100...
-- --------------------------------------------------------
INSERT INTO public.venues (id, owner_id, name, slug, description, address, coordinates, status, avg_rating, amenities, created_at, updated_at)
VALUES
  (
    'd1000000-0000-0000-0000-000000000001', 
    'b0000000-0000-0000-0000-000000000002', 
    'Bahadurabad Futsal Arena', 
    'bahadurabad-futsal-arena', 
    'Premium 5v5 futsal pitch located in the heart of Bahadurabad.', 
    'Bahadurabad, Karachi', 
    ST_GeographyFromText('POINT(67.0673 24.8825)'), 
    'published', 
    4.8, 
    '{"parking": true, "floodlights": true, "washrooms": true, "indoor": false}', 
    now(), 
    now()
  ),
  (
    'd2000000-0000-0000-0000-000000000002', 
    'b0000000-0000-0000-0000-000000000002', 
    'Gulshan Badminton Hub', 
    'gulshan-badminton-hub', 
    'Indoor professional badminton courts with wooden surfaces.', 
    'Gulshan-e-Iqbal, Karachi', 
    ST_GeographyFromText('POINT(67.0971 24.9180)'), 
    'published', 
    4.5, 
    '{"parking": true, "indoor": true, "cafeteria": true}', 
    now(), 
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- 3. Courts
-- --------------------------------------------------------
INSERT INTO public.courts (id, venue_id, name, sport_type, hourly_rate, metadata, created_at, updated_at)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Pitch A (5v5)', 'Futsal', 3000.00, '{"surface": "artificial_turf", "dimension": "30x20m"}', now(), now()),
  ('c2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'Pitch B (7v7)', 'Futsal', 5000.00, '{"surface": "artificial_turf", "dimension": "40x25m"}', now(), now()),
  ('c3000000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000002', 'Court 1 (Wooden)', 'Badminton', 1200.00, '{"surface": "wood", "net_included": true}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- 4. Slots (Available inventory for the upcoming days)
-- --------------------------------------------------------
INSERT INTO public.slots (id, court_id, date, start_time, end_time, status)
VALUES
  -- Bahadurabad Futsal Pitch A
  (gen_random_uuid(), 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '18:00:00', '19:00:00', 'available'),
  (gen_random_uuid(), 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '19:00:00', '20:00:00', 'available'),
  (gen_random_uuid(), 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '20:00:00', '21:00:00', 'available'),
  (gen_random_uuid(), 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '21:00:00', '22:00:00', 'available'),
  
  -- Bahadurabad Futsal Pitch B
  (gen_random_uuid(), 'c2000000-0000-0000-0000-000000000002', CURRENT_DATE + 1, '19:00:00', '20:00:00', 'available'),
  (gen_random_uuid(), 'c2000000-0000-0000-0000-000000000002', CURRENT_DATE + 1, '20:00:00', '21:00:00', 'available'),
  (gen_random_uuid(), 'c2000000-0000-0000-0000-000000000002', CURRENT_DATE + 1, '21:00:00', '22:00:00', 'available'),

  -- Gulshan Badminton Court 1
  (gen_random_uuid(), 'c3000000-0000-0000-0000-000000000003', CURRENT_DATE + 2, '17:00:00', '18:00:00', 'available'),
  (gen_random_uuid(), 'c3000000-0000-0000-0000-000000000003', CURRENT_DATE + 2, '18:00:00', '19:00:00', 'available'),
  (gen_random_uuid(), 'c3000000-0000-0000-0000-000000000003', CURRENT_DATE + 2, '19:00:00', '20:00:00', 'available');
