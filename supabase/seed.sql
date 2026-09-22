-- ==============================================================================
-- Seed: Realistic Karachi Test Data
-- Blueprint: docs/SCHEMA.md
-- Target: supabase/seed.sql
-- Description: Inserts test users, 2 Karachi indoor sports venues (Gulshan & Bahadurabad),
--              3 courts (Futsal & Badminton), and 10 bookable slots for the upcoming week.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Test Auth Users & Profiles (Venue Owners)
-- ------------------------------------------------------------------------------

-- Insert auth users so profiles foreign key (REFERENCES auth.users(id)) resolves cleanly
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
    'd0e527d9-2e11-4f74-8fa7-6cfd38d38801',
    'authenticated',
    'authenticated',
    'owner.gulshan@khel.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Tariq Khan"}',
    now(),
    now()
),
(
    '00000000-0000-0000-0000-000000000000',
    'd0e527d9-2e11-4f74-8fa7-6cfd38d38802',
    'authenticated',
    'authenticated',
    'owner.bahadurabad@khel.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Salman Farooq"}',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Insert matching venue owner profiles
INSERT INTO public.profiles (
    id,
    name,
    phone,
    avatar_url,
    role,
    created_at,
    updated_at
) VALUES
(
    'd0e527d9-2e11-4f74-8fa7-6cfd38d38801',
    'Tariq Khan',
    '+923001234567',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Tariq',
    'venue_owner',
    now(),
    now()
),
(
    'd0e527d9-2e11-4f74-8fa7-6cfd38d38802',
    'Salman Farooq',
    '+923219876543',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Salman',
    'venue_owner',
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role;

-- ------------------------------------------------------------------------------
-- 2. Venues in Karachi (Gulshan-e-Iqbal & Bahadurabad)
-- ------------------------------------------------------------------------------

INSERT INTO public.venues (
    id,
    owner_id,
    name,
    slug,
    description,
    address,
    coordinates,
    status,
    avg_rating,
    created_at,
    updated_at
) VALUES
(
    'e1a80c92-3c1a-4d2b-9a88-2f1d8f330001',
    'd0e527d9-2e11-4f74-8fa7-6cfd38d38801',
    'Gulshan Indoor Sports Complex',
    'gulshan-indoor-sports-complex',
    'Premier climate-controlled indoor facility in Gulshan-e-Iqbal featuring FIFA-grade synthetic turf and professional BWF-standard badminton courts with locker rooms, cafeteria, and secure parking.',
    'Block 5, Gulshan-e-Iqbal, Near Rashid Minhas Road, Karachi',
    ST_SetSRID(ST_MakePoint(67.0982, 24.9180), 4326)::geography,
    'published',
    4.8,
    now(),
    now()
),
(
    'e1a80c92-3c1a-4d2b-9a88-2f1d8f330002',
    'd0e527d9-2e11-4f74-8fa7-6cfd38d38802',
    'Bahadurabad Sports Arena',
    'bahadurabad-sports-arena',
    'State-of-the-art indoor futsal and multipurpose sports arena in the heart of Bahadurabad. Equipped with high-lumen floodlights, spectator stands, and digital scoreboard.',
    'Alamgir Road, Bahadurabad, PECHS Block 3, Karachi',
    ST_SetSRID(ST_MakePoint(67.0694, 24.8825), 4326)::geography,
    'published',
    4.9,
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    coordinates = EXCLUDED.coordinates,
    status = EXCLUDED.status,
    avg_rating = EXCLUDED.avg_rating;

-- ------------------------------------------------------------------------------
-- 3. Courts across Venues (3 Courts total: Futsal & Badminton)
-- ------------------------------------------------------------------------------

INSERT INTO public.courts (
    id,
    venue_id,
    name,
    created_at,
    updated_at
) VALUES
(
    'c0010000-0000-0000-0000-000000000001',
    'e1a80c92-3c1a-4d2b-9a88-2f1d8f330001',
    'Indoor Futsal Pitch A',
    now(),
    now()
),
(
    'c0010000-0000-0000-0000-000000000002',
    'e1a80c92-3c1a-4d2b-9a88-2f1d8f330001',
    'Badminton Court 1',
    now(),
    now()
),
(
    'c0010000-0000-0000-0000-000000000003',
    'e1a80c92-3c1a-4d2b-9a88-2f1d8f330002',
    'Rooftop Futsal Turf',
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    venue_id = EXCLUDED.venue_id,
    name = EXCLUDED.name;

-- ------------------------------------------------------------------------------
-- 4. Slots (10 Available slots for upcoming week across courts)
-- ------------------------------------------------------------------------------

INSERT INTO public.slots (
    id,
    court_id,
    date,
    start_time,
    end_time,
    status
) VALUES
-- Gulshan: Indoor Futsal Pitch A (4 slots)
(
    'f0010000-0000-0000-0000-000000000001',
    'c0010000-0000-0000-0000-000000000001',
    CURRENT_DATE + 1,
    '18:00:00',
    '19:00:00',
    'available'
),
(
    'f0010000-0000-0000-0000-000000000002',
    'c0010000-0000-0000-0000-000000000001',
    CURRENT_DATE + 1,
    '19:00:00',
    '20:00:00',
    'available'
),
(
    'f0010000-0000-0000-0000-000000000003',
    'c0010000-0000-0000-0000-000000000001',
    CURRENT_DATE + 2,
    '20:00:00',
    '21:00:00',
    'available'
),
(
    'f0010000-0000-0000-0000-000000000004',
    'c0010000-0000-0000-0000-000000000001',
    CURRENT_DATE + 3,
    '18:00:00',
    '19:00:00',
    'available'
),

-- Gulshan: Badminton Court 1 (3 slots)
(
    'f0010000-0000-0000-0000-000000000005',
    'c0010000-0000-0000-0000-000000000002',
    CURRENT_DATE + 1,
    '17:00:00',
    '18:00:00',
    'available'
),
(
    'f0010000-0000-0000-0000-000000000006',
    'c0010000-0000-0000-0000-000000000002',
    CURRENT_DATE + 2,
    '18:00:00',
    '19:00:00',
    'available'
),
(
    'f0010000-0000-0000-0000-000000000007',
    'c0010000-0000-0000-0000-000000000002',
    CURRENT_DATE + 3,
    '19:00:00',
    '20:00:00',
    'available'
),

-- Bahadurabad: Rooftop Futsal Turf (3 slots)
(
    'f0010000-0000-0000-0000-000000000008',
    'c0010000-0000-0000-0000-000000000003',
    CURRENT_DATE + 1,
    '20:00:00',
    '21:00:00',
    'available'
),
(
    'f0010000-0000-0000-0000-000000000009',
    'c0010000-0000-0000-0000-000000000003',
    CURRENT_DATE + 2,
    '21:00:00',
    '22:00:00',
    'available'
),
(
    'f0010000-0000-0000-0000-000000000010',
    'c0010000-0000-0000-0000-000000000003',
    CURRENT_DATE + 4,
    '22:00:00',
    '23:00:00',
    'available'
)
ON CONFLICT (court_id, date, start_time) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    status = EXCLUDED.status;
