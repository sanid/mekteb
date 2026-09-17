-- pgTAP: exam system RLS tests.
--
-- Verifies access control for exam_requests and exam_sessions tables:
--   - Tenant isolation (cross-mosque data leak prevention)
--   - Role-based visibility (admin, teacher, examiner, parent, student)
--   - Exam session cancellation status
--   - Visibility helper functions
--
-- Run with: supabase test db

BEGIN;
SELECT plan(24);

-- ---------------------------------------------------------------------------
-- Setup: extract seed IDs, create second mosque for isolation tests
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_id        uuid;
  v_mosque_b_id      uuid;
  v_admin_id         uuid := '00000000-0000-0000-0000-000000000001';
  v_teacher_id       uuid := '00000000-0000-0000-0000-000000000002';
  v_parent_id        uuid := '00000000-0000-0000-0000-000000000003';
  v_examiner_id      uuid := '00000000-0000-0000-0000-000000000004';
  v_teacher_pf       uuid;
  v_examiner_pf      uuid;
  v_parent_pf        uuid;
  v_student_amina    uuid;
  v_student_yusuf    uuid;
  v_student_layla    uuid;
  v_group_a          uuid;
  v_admin_b_id       uuid := '8b000001-0000-0000-0000-000000000001';
  v_teacher_b_id     uuid := '8b000001-0000-0000-0000-000000000002';
  v_examiner_b_pf    uuid;
  v_student_b        uuid;
  v_group_b2         uuid;
  v_req_b            uuid;
BEGIN
  SELECT id INTO v_mosque_id FROM public.mosques WHERE slug = 'dev-mosque';
  SELECT id INTO v_teacher_pf  FROM public.teacher_profiles WHERE profile_id = v_teacher_id;
  SELECT id INTO v_examiner_pf FROM public.teacher_profiles WHERE profile_id = v_examiner_id;
  SELECT id INTO v_parent_pf   FROM public.parent_profiles  WHERE profile_id = v_parent_id;
  SELECT id INTO v_student_amina FROM public.student_profiles WHERE full_name = 'Amina Demirović';
  SELECT id INTO v_student_yusuf FROM public.student_profiles WHERE full_name = 'Yusuf Hadžić';
  SELECT id INTO v_student_layla FROM public.student_profiles WHERE full_name = 'Layla Begić';
  SELECT id INTO v_group_a FROM public.groups WHERE mosque_id = v_mosque_id AND name = 'Group A';

  -- Second mosque with its own users for isolation tests
  INSERT INTO public.mosques (id, name, slug, timezone, locale)
  VALUES ('8b000000-0000-0000-0000-000000000001', 'Mosque B', 'mosque-b', 'UTC', 'en')
  ON CONFLICT (id) DO UPDATE SET name = excluded.name
  RETURNING id INTO v_mosque_b_id;

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    (v_admin_b_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin-b@test.com', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('full_name', 'Admin B'),
     now(), now(), '', '', '', ''),
    (v_teacher_b_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'teacher-b@test.com', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('full_name', 'Teacher B'),
     now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin_b_id,   'email', v_admin_b_id::text,
     jsonb_build_object('sub', v_admin_b_id::text, 'email', 'admin-b@test.com'), now(), now(), now()),
    (gen_random_uuid(), v_teacher_b_id, 'email', v_teacher_b_id::text,
     jsonb_build_object('sub', v_teacher_b_id::text, 'email', 'teacher-b@test.com'), now(), now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.memberships (user_id, mosque_id, role) VALUES
    (v_admin_b_id,   v_mosque_b_id, 'mosque_admin'),
    (v_teacher_b_id, v_mosque_b_id, 'examiner'),
    (v_teacher_b_id, v_mosque_b_id, 'teacher')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.profiles (id, full_name) VALUES
    (v_admin_b_id, 'Admin B'),
    (v_teacher_b_id, 'Teacher B Examiner')
  ON CONFLICT (id) DO UPDATE SET full_name = excluded.full_name;

  INSERT INTO public.teacher_profiles (mosque_id, profile_id, bio)
  VALUES (v_mosque_b_id, v_teacher_b_id, 'Mosque B examiner')
  RETURNING id INTO v_examiner_b_pf;

  INSERT INTO public.student_profiles (mosque_id, full_name)
  VALUES (v_mosque_b_id, 'Student B')
  RETURNING id INTO v_student_b;

  INSERT INTO public.groups (mosque_id, name)
  VALUES (v_mosque_b_id, 'Group B-Mosque')
  RETURNING id INTO v_group_b2;

  INSERT INTO public.group_enrollments (mosque_id, group_id, student_profile_id)
  VALUES (v_mosque_b_id, v_group_b2, v_student_b);

  -- Mosque B exam request + session (should NOT be visible to Mosque A users)
  INSERT INTO public.exam_requests
    (id, mosque_id, student_profile_id, group_id, requested_by, status, created_by, updated_by)
  VALUES
    ('8b000010-0000-0000-0000-000000000001'::uuid,
     v_mosque_b_id, v_student_b, v_group_b2, v_examiner_b_pf,
     'pending', v_teacher_b_id, v_teacher_b_id)
  RETURNING id INTO v_req_b;

  INSERT INTO public.exam_sessions
    (id, mosque_id, exam_request_id, student_profile_id, examiner_profile_id,
     from_group_id, status, created_by, updated_by)
  VALUES
    ('8b000010-0000-0000-0000-000000000002'::uuid,
     v_mosque_b_id, v_req_b, v_student_b, v_examiner_b_pf,
     v_group_b2, 'proposed', v_teacher_b_id, v_teacher_b_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Admin sees all exam_requests and exam_sessions for their mosque
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.exam_requests
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')) >= 6,
  'admin: sees exam_requests in their mosque'
);

SELECT ok(
  (SELECT count(*)::int FROM public.exam_sessions
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')) >= 5,
  'admin: sees exam_sessions in their mosque'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_requests
   WHERE id = '8b000010-0000-0000-0000-000000000001'::uuid),
  0,
  'admin: cannot see mosque-B exam_requests'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_sessions
   WHERE id = '8b000010-0000-0000-0000-000000000002'::uuid),
  0,
  'admin: cannot see mosque-B exam_sessions'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Teacher sees only their own exam_requests
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.exam_requests
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')) >= 6,
  'teacher: sees exam_requests in their mosque'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_requests
   WHERE id = '8b000010-0000-0000-0000-000000000001'::uuid),
  0,
  'teacher: cannot see mosque-B exam_requests'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. Examiner sees sessions assigned to them + mosque isolation
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.exam_sessions
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')) >= 5,
  'examiner: sees exam_sessions in their mosque'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_sessions
   WHERE id = '8b000010-0000-0000-0000-000000000002'::uuid),
  0,
  'examiner: cannot see mosque-B exam_sessions'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Parent sees exam sessions for their linked children only
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

-- Parent is linked to Amina; Amina has 2 sessions (passed + scheduled)
SELECT is(
  (SELECT count(*)::int FROM public.exam_sessions
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')),
  2,
  'parent: sees only 2 exam_sessions for Amina (passed + scheduled)'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_requests
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')),
  2,
  'parent: sees 2 exam_requests for Amina'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. Anon sees nothing
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.exam_requests),
  0,
  'anon: sees 0 exam_requests'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_sessions),
  0,
  'anon: sees 0 exam_sessions'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. Exam session can be set to 'cancelled' status
-- ---------------------------------------------------------------------------

SELECT lives_ok(
  $$UPDATE public.exam_sessions
    SET status = 'cancelled', updated_at = now()
    WHERE id IN (
      SELECT id FROM public.exam_sessions
      WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')
        AND status = 'proposed'
      LIMIT 1
    )$$,
  'exam_sessions: can UPDATE status to cancelled'
);

SELECT ok(
  (SELECT count(*)::int FROM public.exam_sessions
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')
     AND status = 'cancelled') >= 1,
  'exam_sessions: at least one session is cancelled'
);

-- ---------------------------------------------------------------------------
-- 7. Visibility helpers: parent_has_exam_session
-- ---------------------------------------------------------------------------

-- Grab a session ID for Amina (the parent's child) as superuser
RESET ROLE;
CREATE TEMP TABLE _pgtap_session_ids AS
  SELECT es.id AS amina_session_id
  FROM public.exam_sessions es
  JOIN public.student_profiles sp ON sp.id = es.student_profile_id
  WHERE sp.full_name = 'Amina Demirović'
    AND es.mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')
    AND es.status != 'cancelled'
  LIMIT 1;
GRANT SELECT ON _pgtap_session_ids TO authenticated;

-- Grab Yusuf's session (parent is NOT linked to Yusuf)
CREATE TEMP TABLE _pgtap_yusuf_session AS
  SELECT es.id AS yusuf_session_id
  FROM public.exam_sessions es
  JOIN public.student_profiles sp ON sp.id = es.student_profile_id
  WHERE sp.full_name = 'Yusuf Hadžić'
    AND es.mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')
  LIMIT 1;
GRANT SELECT ON _pgtap_yusuf_session TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT app.parent_has_exam_session(amina_session_id) FROM _pgtap_session_ids),
  true,
  'parent_has_exam_session: returns true for parent''s own child session'
);

SELECT is(
  (SELECT app.parent_has_exam_session(yusuf_session_id) FROM _pgtap_yusuf_session),
  false,
  'parent_has_exam_session: returns false for unlinked child session'
);

RESET ROLE;
DROP TABLE _pgtap_session_ids;
DROP TABLE _pgtap_yusuf_session;

-- ---------------------------------------------------------------------------
-- 8. Visibility helpers: student_owns_exam_session
-- ---------------------------------------------------------------------------

-- Amina has a student_profile. We need her profile_id for auth context.
-- Amina does NOT have an auth account in seed, so test with the examiner
-- (who is also a teacher, not a student). Test false case with the parent user.
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

-- Parent is not a student, so should always return false
CREATE TEMP TABLE _pgtap_any_session AS
  SELECT id AS any_session_id FROM public.exam_sessions LIMIT 1;
GRANT SELECT ON _pgtap_any_session TO authenticated;

SELECT is(
  (SELECT app.student_owns_exam_session(any_session_id) FROM _pgtap_any_session),
  false,
  'student_owns_exam_session: returns false for non-student user'
);

RESET ROLE;
DROP TABLE _pgtap_any_session;

-- ---------------------------------------------------------------------------
-- 9. Visibility helpers: teacher_requested_exam_session
-- ---------------------------------------------------------------------------

-- The teacher (0002) requested the seed exam_requests.
-- Grab a session that has an exam_request_id from that teacher. The bosnian
-- seed adds exam sessions requested by other teachers, so filter by the
-- requesting teacher profile rather than taking any session at random.
CREATE TEMP TABLE _pgtap_teacher_session AS
  SELECT es.id AS teacher_session_id
  FROM public.exam_sessions es
  JOIN public.exam_requests er ON er.id = es.exam_request_id
  JOIN public.teacher_profiles tp ON tp.id = er.requested_by
  WHERE tp.profile_id = '00000000-0000-0000-0000-000000000002'
    AND es.mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')
  LIMIT 1;
GRANT SELECT ON _pgtap_teacher_session TO authenticated;

-- Teacher should see their requested sessions
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT app.teacher_requested_exam_session(teacher_session_id) FROM _pgtap_teacher_session),
  true,
  'teacher_requested_exam_session: returns true for teacher who requested'
);

-- Parent should NOT see teacher access
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT app.teacher_requested_exam_session(teacher_session_id) FROM _pgtap_teacher_session),
  false,
  'teacher_requested_exam_session: returns false for parent user'
);

RESET ROLE;
DROP TABLE _pgtap_teacher_session;

-- ---------------------------------------------------------------------------
-- 10. Mosque-B admin sees only mosque-B exams
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"8b000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.exam_requests
   WHERE id = '8b000010-0000-0000-0000-000000000001'::uuid),
  1,
  'mosque-B admin: sees their own exam_request'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_requests
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')),
  0,
  'mosque-B admin: cannot see mosque-A exam_requests'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 11. school_year_start column exists on mosques
-- ---------------------------------------------------------------------------

SELECT is(
  (SELECT school_year_start IS NULL FROM public.mosques WHERE slug = 'dev-mosque'),
  true,
  'mosques.school_year_start: exists and defaults to NULL'
);

SELECT lives_ok(
  $$UPDATE public.mosques SET school_year_start = '2025-09-01' WHERE slug = 'dev-mosque'$$,
  'mosques.school_year_start: can be set to a date'
);

SELECT is(
  (SELECT school_year_start FROM public.mosques WHERE slug = 'dev-mosque')::text,
  '2025-09-01',
  'mosques.school_year_start: stores the correct date'
);

-- ---------------------------------------------------------------------------

SELECT * FROM finish();
ROLLBACK;
