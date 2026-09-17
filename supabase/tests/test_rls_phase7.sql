-- pgTAP: tenant-isolation + RLS tests for the post-Phase-7 tables that were
-- added without dedicated coverage: calendar_events, diploma_templates,
-- hifz_progress, exam_questions, written_tests/written_test_answers,
-- plugin_registry/mosque_plugins, plans/mosque_subscriptions, and
-- gdpr_deletion_log.
--
-- Run with: supabase test db

BEGIN;
SELECT plan(43);

-- ---------------------------------------------------------------------------
-- Setup: second mosque ("Mosque B") with its own admin/examiner/platform-owner
-- users, plus one row per new table for both mosques.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_a       uuid;
  v_examiner_pf_a  uuid;
  v_group_a        uuid;
  v_student_amina  uuid;
  v_exam_question_a uuid := '7a000000-0000-0000-0000-00000000001d';
  v_exam_question_b uuid := '7b000000-0000-0000-0000-00000000001d';
  v_mosque_b       uuid := '7b000000-0000-0000-0000-000000000000';
  v_admin_b        uuid := '7b000000-0000-0000-0000-000000000001';
  v_examiner_b     uuid := '7b000000-0000-0000-0000-000000000002';
  v_owner          uuid := '7b000000-0000-0000-0000-000000000003';
  v_teacher_pf_b   uuid := '7b000000-0000-0000-0000-000000000010';
  v_student_b      uuid := '7b000000-0000-0000-0000-000000000011';
  v_group_b        uuid := '7b000000-0000-0000-0000-000000000012';
BEGIN
  SELECT id INTO v_mosque_a FROM public.mosques WHERE slug = 'dev-mosque';
  SELECT id INTO v_examiner_pf_a FROM public.teacher_profiles
    WHERE profile_id = '00000000-0000-0000-0000-000000000004';
  SELECT id INTO v_group_a FROM public.groups WHERE mosque_id = v_mosque_a AND name = 'Group A';
  SELECT id INTO v_student_amina FROM public.student_profiles WHERE full_name = 'Amina Demirović';

  -- Mosque B + its users (admin, examiner/teacher, platform owner)
  INSERT INTO public.mosques (id, name, slug, timezone, locale)
  VALUES (v_mosque_b, 'Phase7 Mosque B', 'phase7-mosque-b', 'UTC', 'en')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES
    (v_admin_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'p7-admin-b@test.invalid', crypt('pw', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"P7 Admin B"}'::jsonb,
     now(), now(), '', '', '', ''),
    (v_examiner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'p7-examiner-b@test.invalid', crypt('pw', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"P7 Examiner B"}'::jsonb,
     now(), now(), '', '', '', ''),
    (v_owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'p7-owner@test.invalid', crypt('pw', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"P7 Platform Owner"}'::jsonb,
     now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin_b,    'email', v_admin_b::text,
     jsonb_build_object('sub', v_admin_b::text, 'email', 'p7-admin-b@test.invalid'), now(), now(), now()),
    (gen_random_uuid(), v_examiner_b, 'email', v_examiner_b::text,
     jsonb_build_object('sub', v_examiner_b::text, 'email', 'p7-examiner-b@test.invalid'), now(), now(), now()),
    (gen_random_uuid(), v_owner,      'email', v_owner::text,
     jsonb_build_object('sub', v_owner::text, 'email', 'p7-owner@test.invalid'), now(), now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.memberships (user_id, mosque_id, role) VALUES
    (v_admin_b,    v_mosque_b, 'mosque_admin'),
    (v_examiner_b, v_mosque_b, 'examiner'),
    (v_examiner_b, v_mosque_b, 'teacher'),
    (v_owner,      v_mosque_b, 'platform_owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.teacher_profiles (id, mosque_id, profile_id, bio)
  VALUES (v_teacher_pf_b, v_mosque_b, v_examiner_b, 'Phase7 mosque B examiner')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.student_profiles (id, mosque_id, full_name)
  VALUES (v_student_b, v_mosque_b, 'Phase7 Student B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.groups (id, mosque_id, name)
  VALUES (v_group_b, v_mosque_b, 'Phase7 Group B')
  ON CONFLICT (id) DO NOTHING;

  -- calendar_events: one per mosque
  INSERT INTO public.calendar_events (id, mosque_id, title, date, visibility) VALUES
    ('7a000000-0000-0000-0000-00000000001a', v_mosque_a, 'Mosque A Event', current_date + 1, 'all'),
    ('7b000000-0000-0000-0000-00000000001a', v_mosque_b, 'Mosque B Event', current_date + 1, 'all')
  ON CONFLICT (id) DO NOTHING;

  -- diploma_templates: one per mosque
  INSERT INTO public.diploma_templates (id, mosque_id, name) VALUES
    ('7a000000-0000-0000-0000-00000000001b', v_mosque_a, 'Mosque A Diploma'),
    ('7b000000-0000-0000-0000-00000000001b', v_mosque_b, 'Mosque B Diploma')
  ON CONFLICT (id) DO NOTHING;

  -- hifz_progress: one per mosque (student + group must belong to same mosque)
  INSERT INTO public.hifz_progress (id, mosque_id, student_profile_id, group_id, pages_memorized) VALUES
    ('7a000000-0000-0000-0000-00000000001c', v_mosque_a, v_student_amina, v_group_a, 10),
    ('7b000000-0000-0000-0000-00000000001c', v_mosque_b, v_student_b, v_group_b, 5)
  ON CONFLICT (id) DO NOTHING;

  -- exam_questions: one per mosque
  INSERT INTO public.exam_questions (id, mosque_id, question_text) VALUES
    (v_exam_question_a, v_mosque_a, 'Mosque A: What is the meaning of Salah?'),
    (v_exam_question_b, v_mosque_b, 'Mosque B: What is the meaning of Salah?')
  ON CONFLICT (id) DO NOTHING;

  -- written_tests + written_test_answers: one per mosque
  INSERT INTO public.written_tests (id, mosque_id, examiner_profile_id, student_profile_id, title, question_ids) VALUES
    ('7a000000-0000-0000-0000-00000000001e', v_mosque_a, v_examiner_pf_a, v_student_amina, 'Mosque A Written Test', ARRAY[v_exam_question_a]),
    ('7b000000-0000-0000-0000-00000000001e', v_mosque_b, v_teacher_pf_b, v_student_b, 'Mosque B Written Test', ARRAY[v_exam_question_b])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.written_test_answers (id, mosque_id, written_test_id, question_id, question_order) VALUES
    ('7a000000-0000-0000-0000-00000000001f', v_mosque_a, '7a000000-0000-0000-0000-00000000001e', v_exam_question_a, 1),
    ('7b000000-0000-0000-0000-00000000001f', v_mosque_b, '7b000000-0000-0000-0000-00000000001e', v_exam_question_b, 1)
  ON CONFLICT (id) DO NOTHING;

  -- gdpr_deletion_log: not mosque-scoped by RLS (platform-owner only)
  INSERT INTO public.gdpr_deletion_log (id, mosque_id, mosque_name, mosque_slug, requested_by_email) VALUES
    ('7a000000-0000-0000-0000-000000000020', v_mosque_a, 'Some Deleted Mosque', 'deleted-mosque', 'owner@test.invalid')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. calendar_events
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.calendar_events
   WHERE id = '7a000000-0000-0000-0000-00000000001a'::uuid) = 1,
  'admin-a: sees own mosque calendar_events'
);

SELECT is(
  (SELECT count(*)::int FROM public.calendar_events
   WHERE id = '7b000000-0000-0000-0000-00000000001a'::uuid),
  0,
  'admin-a: cannot see mosque-B calendar_events'
);

SELECT lives_ok(
  $$UPDATE public.calendar_events SET title = 'Mosque A Event (updated)'
    WHERE id = '7a000000-0000-0000-0000-00000000001a'::uuid$$,
  'admin-a: can update own mosque calendar_events'
);

SELECT throws_ok(
  $$INSERT INTO public.calendar_events (mosque_id, title, date)
    VALUES ('7b000000-0000-0000-0000-000000000000'::uuid, 'Infiltrated', current_date)$$,
  'new row violates row-level security policy for table "calendar_events"',
  'admin-a: cannot INSERT a calendar_event into mosque B'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.calendar_events
   WHERE id = '7a000000-0000-0000-0000-00000000001a'::uuid) = 1,
  'teacher-a: sees mosque A calendar_events (visibility = all)'
);

RESET ROLE;

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.calendar_events),
  0,
  'anon: sees 0 calendar_events'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. diploma_templates
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.diploma_templates
   WHERE id = '7a000000-0000-0000-0000-00000000001b'::uuid) = 1,
  'admin-a: sees own mosque diploma_templates'
);

SELECT is(
  (SELECT count(*)::int FROM public.diploma_templates
   WHERE id = '7b000000-0000-0000-0000-00000000001b'::uuid),
  0,
  'admin-a: cannot see mosque-B diploma_templates'
);

SELECT lives_ok(
  $$INSERT INTO public.diploma_templates (mosque_id, name)
    VALUES ((SELECT id FROM public.mosques WHERE slug = 'dev-mosque'), 'Admin-created Diploma')$$,
  'admin-a: can insert diploma_templates in own mosque'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.diploma_templates
   WHERE id = '7a000000-0000-0000-0000-00000000001b'::uuid) = 1,
  'teacher-a: can read diploma_templates for own mosque'
);

SELECT throws_ok(
  $$INSERT INTO public.diploma_templates (mosque_id, name)
    VALUES ((SELECT id FROM public.mosques WHERE slug = 'dev-mosque'), 'Teacher-created Diploma')$$,
  'new row violates row-level security policy for table "diploma_templates"',
  'teacher-a: cannot INSERT diploma_templates (admin only)'
);

RESET ROLE;

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.diploma_templates),
  0,
  'anon: sees 0 diploma_templates'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. hifz_progress
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.hifz_progress
   WHERE id = '7a000000-0000-0000-0000-00000000001c'::uuid) = 1,
  'admin-a: sees own mosque hifz_progress'
);

SELECT is(
  (SELECT count(*)::int FROM public.hifz_progress
   WHERE id = '7b000000-0000-0000-0000-00000000001c'::uuid),
  0,
  'admin-a: cannot see mosque-B hifz_progress'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.hifz_progress
   WHERE id = '7a000000-0000-0000-0000-00000000001c'::uuid) = 1,
  'teacher-a: sees hifz_progress for their group (Group A)'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.hifz_progress
   WHERE id = '7a000000-0000-0000-0000-00000000001c'::uuid),
  1,
  'parent-a: sees only their own child''s hifz_progress (Amina)'
);

RESET ROLE;

SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" TO '{"role":"anon"}';

SELECT is(
  (SELECT count(*)::int FROM public.hifz_progress),
  0,
  'anon: sees 0 hifz_progress'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. exam_questions
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.exam_questions
   WHERE id = '7a000000-0000-0000-0000-00000000001d'::uuid) = 1,
  'admin-a: sees own mosque exam_questions'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_questions
   WHERE id = '7b000000-0000-0000-0000-00000000001d'::uuid),
  0,
  'admin-a: cannot see mosque-B exam_questions'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.exam_questions
   WHERE id = '7a000000-0000-0000-0000-00000000001d'::uuid) = 1,
  'examiner-a: sees active exam_questions for own mosque'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_questions
   WHERE id = '7b000000-0000-0000-0000-00000000001d'::uuid),
  0,
  'examiner-a: cannot see mosque-B exam_questions'
);

RESET ROLE;

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.exam_questions),
  0,
  'anon: sees 0 exam_questions'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. written_tests / written_test_answers
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.written_tests
   WHERE id = '7a000000-0000-0000-0000-00000000001e'::uuid) = 1,
  'admin-a: sees own mosque written_tests'
);

SELECT is(
  (SELECT count(*)::int FROM public.written_tests
   WHERE id = '7b000000-0000-0000-0000-00000000001e'::uuid),
  0,
  'admin-a: cannot see mosque-B written_tests'
);

SELECT ok(
  (SELECT count(*)::int FROM public.written_test_answers
   WHERE id = '7a000000-0000-0000-0000-00000000001f'::uuid) = 1,
  'admin-a: sees own mosque written_test_answers'
);

SELECT is(
  (SELECT count(*)::int FROM public.written_test_answers
   WHERE id = '7b000000-0000-0000-0000-00000000001f'::uuid),
  0,
  'admin-a: cannot see mosque-B written_test_answers'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.written_tests
   WHERE id = '7a000000-0000-0000-0000-00000000001e'::uuid) = 1,
  'examiner-a: sees own mosque written_tests'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.written_tests),
  0,
  'parent-a: sees 0 written_tests (no examiner/admin role)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. plugin_registry / mosque_plugins
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" TO '{"role":"anon"}';

SELECT is(
  (SELECT count(*)::int FROM public.plugin_registry),
  0,
  'anon: sees 0 plugin_registry rows'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.plugin_registry) > 0,
  'parent-a: any authenticated user can read plugin_registry'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.mosque_plugins
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')) > 0,
  'admin-a: sees own mosque mosque_plugins'
);

SELECT is(
  (SELECT count(*)::int FROM public.mosque_plugins
   WHERE mosque_id = '7b000000-0000-0000-0000-000000000000'::uuid),
  0,
  'admin-a: cannot see mosque-B mosque_plugins'
);

SELECT lives_ok(
  $$UPDATE public.mosque_plugins SET is_active = false
    WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')
      AND plugin_id = 'calendar'$$,
  'admin-a: can update mosque_plugins for own mosque'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

WITH upd AS (
  UPDATE public.mosque_plugins SET is_active = true
    WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')
      AND plugin_id = 'calendar'
    RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM upd),
  0,
  'teacher-a: cannot update mosque_plugins (admin only)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 7. plans / mosque_subscriptions
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.plans),
  3,
  'anon: can read all plans (public pricing)'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.mosque_subscriptions
   WHERE mosque_id = (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')),
  1,
  'admin-a: sees own mosque subscription'
);

SELECT is(
  (SELECT count(*)::int FROM public.mosque_subscriptions
   WHERE mosque_id = '7b000000-0000-0000-0000-000000000000'::uuid),
  0,
  'admin-a: cannot see mosque-B subscription'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.mosque_subscriptions),
  0,
  'teacher-a: sees 0 mosque_subscriptions (admin only)'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"7b000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.mosque_subscriptions) >= 2,
  'platform-owner: sees mosque_subscriptions across all mosques'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 8. gdpr_deletion_log
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.gdpr_deletion_log),
  0,
  'admin-a: sees 0 gdpr_deletion_log rows'
);

SELECT throws_ok(
  $$INSERT INTO public.gdpr_deletion_log (mosque_id, mosque_name, mosque_slug, requested_by_email)
    VALUES (gen_random_uuid(), 'Evil Mosque', 'evil-mosque', 'admin-a@test.invalid')$$,
  'new row violates row-level security policy for table "gdpr_deletion_log"',
  'admin-a: cannot INSERT into gdpr_deletion_log (platform owner only)'
);

RESET ROLE;

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.gdpr_deletion_log),
  0,
  'anon: sees 0 gdpr_deletion_log rows'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"7b000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT ok(
  (SELECT count(*)::int FROM public.gdpr_deletion_log) >= 1,
  'platform-owner: sees gdpr_deletion_log rows'
);

RESET ROLE;

-- ---------------------------------------------------------------------------

SELECT * FROM finish();
ROLLBACK;
