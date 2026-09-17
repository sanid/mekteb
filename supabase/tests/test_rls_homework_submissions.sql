-- pgTAP: homework_submissions RLS tests.
--
-- Verifies that parents can acknowledge homework for their linked
-- children, teachers can read submissions for their groups, and
-- cross-boundary access is denied.
--
-- Run with: supabase test db

BEGIN;
SELECT plan(8);

-- ---------------------------------------------------------------------------
-- Setup
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_id     uuid;
  v_teacher_pf    uuid;
  v_parent_pf     uuid;
  v_student_amina uuid;
  v_student_layla uuid;
  v_group_a       uuid;
  v_group_student uuid;
BEGIN
  SELECT id INTO v_mosque_id FROM public.mosques WHERE slug = 'dev-mosque';
  SELECT id INTO v_teacher_pf FROM public.teacher_profiles WHERE profile_id = '00000000-0000-0000-0000-000000000002';
  SELECT id INTO v_parent_pf  FROM public.parent_profiles  WHERE profile_id = '00000000-0000-0000-0000-000000000003';
  SELECT id INTO v_student_amina FROM public.student_profiles WHERE full_name = 'Amina Demirović';
  SELECT id INTO v_student_layla FROM public.student_profiles WHERE full_name = 'Layla Begić';
  SELECT id INTO v_group_a FROM public.groups WHERE mosque_id = v_mosque_id LIMIT 1;

  -- The student-acknowledgement tests need a group Amina is actually enrolled
  -- in: check_submission_mosque() is not security-definer, so its homework
  -- lookup runs under the caller's RLS. A student who cannot see the
  -- assignment gets a null mosque and the trigger raises — the tests would
  -- then fail for the wrong reason.
  SELECT ge.group_id INTO v_group_student
  FROM public.group_enrollments ge
  JOIN public.student_profiles sp ON sp.id = ge.student_profile_id
  WHERE sp.full_name = 'Amina Demirović' AND ge.is_active
  LIMIT 1;

  -- Published group homework
  INSERT INTO public.homework_assignments (id, mosque_id, group_id, title, audience, is_published)
  VALUES (
    '9e000001-0000-0000-0000-000000000001'::uuid,
    v_mosque_id, v_group_a,
    'Submission Test HW', 'group', true
  ),
  -- Second assignment, left un-acknowledged, for the student-ack tests below.
  (
    '9e000001-0000-0000-0000-000000000002'::uuid,
    v_mosque_id, v_group_student,
    'Student Ack Test HW', 'group', true
  );

  -- Parent acknowledges for Amina (their linked child)
  INSERT INTO public.homework_submissions (id, mosque_id, homework_id, student_profile_id, acknowledged_by)
  VALUES (
    '9e000002-0000-0000-0000-000000000001'::uuid,
    v_mosque_id,
    '9e000001-0000-0000-0000-000000000001'::uuid,
    v_student_amina,
    '00000000-0000-0000-0000-000000000003'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Parent can read their child's submission
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.homework_submissions
    WHERE id = '9e000002-0000-0000-0000-000000000001'::uuid),
  1,
  'parent: sees their child''s homework submission'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Teacher can read submissions for their groups
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.homework_submissions
    WHERE id = '9e000002-0000-0000-0000-000000000001'::uuid),
  1,
  'teacher: sees submissions for their group''s homework'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. Admin can read all submissions
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.homework_submissions
    WHERE id = '9e000002-0000-0000-0000-000000000001'::uuid),
  1,
  'admin: sees all submissions in their mosque'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Parent cannot acknowledge for an unlinked child (Layla)
-- ---------------------------------------------------------------------------

RESET ROLE;
CREATE TEMP TABLE _hs_test_ids AS
  SELECT
    (SELECT id FROM public.student_profiles WHERE full_name = 'Layla Begić' LIMIT 1) AS layla_id,
    (SELECT id FROM public.mosques WHERE slug = 'dev-mosque') AS mosque_id;
GRANT SELECT ON _hs_test_ids TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.homework_submissions (mosque_id, homework_id, student_profile_id, acknowledged_by)
    SELECT t.mosque_id, '9e000001-0000-0000-0000-000000000001'::uuid, t.layla_id,
           '00000000-0000-0000-0000-000000000003'
    FROM _hs_test_ids t$$,
  NULL,
  'parent: cannot acknowledge for an unlinked child'
);

RESET ROLE;
DROP TABLE _hs_test_ids;

-- ---------------------------------------------------------------------------
-- 5. Teacher cannot INSERT a submission (read-only)
-- ---------------------------------------------------------------------------

RESET ROLE;
CREATE TEMP TABLE _hs_test_ids2 AS
  SELECT
    (SELECT id FROM public.student_profiles WHERE full_name = 'Amina Demirović' LIMIT 1) AS amina_id,
    (SELECT id FROM public.mosques WHERE slug = 'dev-mosque') AS mosque_id;
GRANT SELECT ON _hs_test_ids2 TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.homework_submissions (mosque_id, homework_id, student_profile_id, acknowledged_by)
    SELECT t.mosque_id, '9e000001-0000-0000-0000-000000000001'::uuid, t.amina_id,
           '00000000-0000-0000-0000-000000000002'
    FROM _hs_test_ids2 t$$,
  NULL,
  'teacher: cannot INSERT homework submissions'
);

RESET ROLE;
DROP TABLE _hs_test_ids2;

-- ---------------------------------------------------------------------------
-- 6-8. Student acknowledges their own homework, and only their own
--
-- Regression: homework_submissions had no student policy at all, so the
-- student portal's "Mark as done" button and acknowledgeHomework() always
-- failed with an RLS violation, and students could never see their own
-- acknowledged state.
-- ---------------------------------------------------------------------------

RESET ROLE;

-- Seeded students have no login account (student_profiles.profile_id is null),
-- so give Amina one for the duration of this transaction.
DO $$
DECLARE
  v_student_user uuid := '9e000009-0000-0000-0000-000000000001';
  v_amina        uuid;
  v_mosque       uuid;
BEGIN
  SELECT id INTO v_amina FROM public.student_profiles WHERE full_name = 'Amina Demirović';
  SELECT id INTO v_mosque FROM public.mosques WHERE slug = 'dev-mosque';

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_student_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'hs-student@test.invalid', crypt('pw', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Amina Demirović"}'::jsonb,
    now(), now(), '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  UPDATE public.student_profiles SET profile_id = v_student_user WHERE id = v_amina;


  INSERT INTO public.memberships (mosque_id, user_id, role, is_active, created_by, updated_by)
  VALUES (v_mosque, v_student_user, 'student', true, v_student_user, v_student_user)
  ON CONFLICT DO NOTHING;
END $$;

CREATE TEMP TABLE _hs_student_ids AS
  SELECT
    (SELECT id FROM public.student_profiles WHERE full_name = 'Amina Demirović' LIMIT 1) AS amina_id,
    (SELECT id FROM public.student_profiles WHERE full_name = 'Layla Begić' LIMIT 1) AS layla_id,
    '9e000009-0000-0000-0000-000000000001'::uuid AS amina_user,
    (SELECT id FROM public.mosques WHERE slug = 'dev-mosque') AS mosque_id;
GRANT SELECT ON _hs_student_ids TO authenticated;

SET LOCAL "request.jwt.claims" TO
  '{"sub":"9e000009-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.homework_submissions (mosque_id, homework_id, student_profile_id, acknowledged_by)
    SELECT t.mosque_id, '9e000001-0000-0000-0000-000000000002'::uuid, t.amina_id, t.amina_user
    FROM _hs_student_ids t$$,
  'student: can acknowledge their own homework'
);

SELECT is(
  (SELECT count(*)::int FROM public.homework_submissions hs
     JOIN _hs_student_ids t ON hs.student_profile_id = t.amina_id
   WHERE hs.homework_id = '9e000001-0000-0000-0000-000000000002'),
  1,
  'student: can read back their own submission'
);

SELECT throws_ok(
  $$INSERT INTO public.homework_submissions (mosque_id, homework_id, student_profile_id, acknowledged_by)
    SELECT t.mosque_id, '9e000001-0000-0000-0000-000000000001'::uuid, t.layla_id, t.amina_user
    FROM _hs_student_ids t$$,
  NULL,
  'student: cannot acknowledge on behalf of another student'
);

RESET ROLE;
DROP TABLE _hs_student_ids;

-- ---------------------------------------------------------------------------

SELECT * FROM finish();
ROLLBACK;
