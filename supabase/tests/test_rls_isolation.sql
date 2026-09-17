-- pgTAP: tenant-isolation RLS tests.
--
-- Verifies that a member of mosque A cannot read data that belongs to mosque B,
-- and that anonymous callers see nothing in business tables.
--
-- Run with: supabase test db

BEGIN;
SELECT plan(16);

-- ---------------------------------------------------------------------------
-- Setup: create a second, isolated mosque with its own admin user.
-- All INSERTs are rolled back at ROLLBACK below.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_b  uuid := '0b000000-0000-0000-0000-000000000000'::uuid;
  v_admin_b   uuid := '0b000000-0000-0000-0000-000000000001'::uuid;
  v_parent_b  uuid := '0b000000-0000-0000-0000-000000000002'::uuid;
  v_student_b uuid;
  v_group_b   uuid;
  v_parent_profile_b uuid;
BEGIN
  -- Mosque B
  INSERT INTO public.mosques (id, name, slug, timezone, locale)
  VALUES (v_mosque_b, 'Test Mosque B', 'test-mosque-b', 'UTC', 'en');

  -- Auth users for mosque B
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES
  (v_admin_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin-b@test.invalid', crypt('pw', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin B"}'::jsonb,
    now(), now(), '', '', '', ''),
  (v_parent_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'parent-b@test.invalid', crypt('pw', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Parent B"}'::jsonb,
    now(), now(), '', '', '', '');

  -- Profiles (trigger creates them, but let's be explicit about mosque_id via memberships)
  INSERT INTO public.memberships (user_id, mosque_id, role) VALUES
    (v_admin_b,  v_mosque_b, 'mosque_admin'),
    (v_parent_b, v_mosque_b, 'parent');

  INSERT INTO public.parent_profiles (mosque_id, profile_id, relation)
  VALUES (v_mosque_b, v_parent_b, 'parent')
  RETURNING id INTO v_parent_profile_b;

  INSERT INTO public.groups (id, mosque_id, name)
  VALUES ('0b000000-0000-0000-0000-000000000010'::uuid, v_mosque_b, 'B Group');

  INSERT INTO public.student_profiles (mosque_id, full_name)
  VALUES (v_mosque_b, 'Student B')
  RETURNING id INTO v_student_b;

  INSERT INTO public.parent_student_links (mosque_id, parent_profile_id, student_profile_id)
  VALUES (v_mosque_b, v_parent_profile_b, v_student_b);
END;
$$;

-- ---------------------------------------------------------------------------
-- Helpers: resolve IDs from seed
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_a uuid;
BEGIN
  SELECT id INTO v_mosque_a FROM public.mosques WHERE slug = 'dev-mosque';
  IF v_mosque_a IS NULL THEN
    RAISE EXCEPTION 'Seed mosque not found — run supabase db reset first';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Anonymous access — no business data visible
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.groups),
  0,
  'anon: groups returns 0 rows'
);

SELECT is(
  (SELECT count(*)::int FROM public.student_profiles),
  0,
  'anon: student_profiles returns 0 rows'
);

SELECT is(
  (SELECT count(*)::int FROM public.memberships),
  0,
  'anon: memberships returns 0 rows'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Mosque A admin sees only mosque A data
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.groups) > 0,
  'admin-a: sees groups in their own mosque'
);

SELECT is(
  (SELECT count(*)::int FROM public.groups
    WHERE mosque_id = '0b000000-0000-0000-0000-000000000000'::uuid),
  0,
  'admin-a: cannot see mosque B groups'
);

SELECT ok(
  (SELECT count(*)::int FROM public.student_profiles) >= 3,
  'admin-a: sees at least 3 students from mosque A'
);

SELECT ok(
  (SELECT count(*)::int FROM public.memberships) >= 3,
  'admin-a: sees at least 3 memberships from mosque A'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. Mosque B admin sees only mosque B data
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"0b000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.groups),
  1,
  'admin-b: sees exactly 1 group (their own mosque)'
);

SELECT is(
  (SELECT count(*)::int FROM public.groups
    WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')),
  0,
  'admin-b: cannot see mosque A groups'
);

SELECT is(
  (SELECT count(*)::int FROM public.student_profiles),
  1,
  'admin-b: sees only 1 student (their own mosque)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Mosque A teacher sees only mosque A data
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.groups) >= 1,
  'teacher-a: sees mosque A groups'
);

SELECT is(
  (SELECT count(*)::int FROM public.groups
    WHERE mosque_id = '0b000000-0000-0000-0000-000000000000'::uuid),
  0,
  'teacher-a: cannot see mosque B groups'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. Mosque A parent sees only mosque A data
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.student_profiles),
  1,
  'parent-a: sees only their linked student (Amina)'
);

SELECT is(
  (SELECT count(*)::int FROM public.student_profiles
    WHERE mosque_id = '0b000000-0000-0000-0000-000000000000'::uuid),
  0,
  'parent-a: cannot see mosque B students'
);

SELECT is(
  (SELECT count(*)::int FROM public.parent_student_links),
  1,
  'parent-a: sees only their own parent_student_link (Amina)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. Cross-mosque write attempt — should fail
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.groups (mosque_id, name)
    VALUES ('0b000000-0000-0000-0000-000000000000'::uuid, 'Infiltrated')$$,
  'new row violates row-level security policy for table "groups"',
  'admin-a: cannot INSERT a group into mosque B'
);

RESET ROLE;

-- ---------------------------------------------------------------------------

SELECT * FROM finish();
ROLLBACK;
