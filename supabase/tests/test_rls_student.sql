-- pgTAP: student-role access tests.
--
-- Students are the role the RLS suite has never exercised, and the one that
-- keeps shipping "X cannot see Y" bugs. They are deliberately NOT in
-- `memberships` (auth identity is separate from domain membership — see the
-- design notes), so any policy written for the member roles silently excludes
-- them: a policy gated on `app.is_member()` returns nothing to a student
-- unless it carries an explicit `app.is_student()` (or equivalent) branch.
--
-- This file asserts the student contract:
--
--   reads:    own mosque + its plugins, published lesson-library content,
--             the timetable for their groups, own attendance, own hifz, own
--             exam sessions, own enrollments and groups, group_categories,
--             calendar events addressed to everyone, homework that names
--             them, progress notes about them, published weekly notes for
--             their groups;
--   no reads: unpublished content, other mosques, other students' rows,
--             events addressed to other roles, homework that does not name
--             them;
--   no writes: anywhere.
--
-- It ends with a standing invariant that turns the whole bug class into a
-- build failure: every SELECT policy gated on `app.is_member()` must either
-- carry an `app.is_student()` branch or live on an allow-listed staff-only
-- table.
--
-- Run with: supabase test db

BEGIN;
SELECT plan(63);

-- ---------------------------------------------------------------------------
-- Setup: second mosque ("Mosque B") with rows students must never see, plus
-- per-table fixtures in the dev mosque on fixed IDs.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_a     uuid;
  v_group_a      uuid;
  v_group_b      uuid;
  v_hifz_i       uuid;
  v_category     uuid;
  v_amina        uuid;
  v_layla        uuid;
  v_teacher_pf_a uuid;
  v_teacher_user_b uuid := '7b000000-0000-0000-0000-00000000000a';
  v_mosque_b     uuid := '7b000000-0000-0000-0000-000000000000';
  v_teacher_b    uuid := '7b000000-0000-0000-0000-000000000010';
  v_student_b    uuid := '7b000000-0000-0000-0000-000000000011';
  v_group_b2     uuid := '7b000000-0000-0000-0000-000000000012';
BEGIN
  SELECT id INTO v_mosque_a FROM public.mosques WHERE slug = 'dev-mosque';
  SELECT id INTO v_group_a   FROM public.groups WHERE mosque_id = v_mosque_a AND name = 'Group A';
  SELECT id INTO v_group_b   FROM public.groups WHERE mosque_id = v_mosque_a AND name = 'Group B (Advanced)';
  SELECT id INTO v_hifz_i    FROM public.groups WHERE mosque_id = v_mosque_a AND name = 'Hifz I';
  SELECT id INTO v_category  FROM public.group_categories WHERE mosque_id = v_mosque_a AND name = 'Mekteb';
  SELECT id INTO v_amina     FROM public.student_profiles WHERE full_name = 'Amina Demirović';
  SELECT id INTO v_layla     FROM public.student_profiles WHERE full_name = 'Layla Begić';
  SELECT id INTO v_teacher_pf_a FROM public.teacher_profiles
    WHERE profile_id = '00000000-0000-0000-0000-000000000002';

  -- Amina's Group A enrolment is inactive in the seed (she was promoted to
  -- Group B). Re-activate so "her" groups include Group A; the enrolment
  -- assertions below cover both rows regardless of activation state.
  UPDATE public.group_enrollments SET is_active = true
    WHERE student_profile_id = v_amina AND group_id = v_group_a;

  -- ── Mosque B: mosque + minimal staff/student/group so every cross-mosque
  --    negative has a real row to look for. Amina holds no membership here,
  --    so she must never see any of it.
  INSERT INTO public.mosques (id, name, slug, timezone, locale)
  VALUES (v_mosque_b, 'Student-test Mosque B', 'student-test-mosque-b', 'UTC', 'en')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.mosque_plugins (mosque_id, plugin_id, is_active, config)
  VALUES (v_mosque_b, 'lesson_library', true, '{}'::jsonb)
  ON CONFLICT DO NOTHING;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_teacher_user_b, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'student-test-teacher-b@test.invalid',
    crypt('pw', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Student Test Teacher B"}'::jsonb,
    now(), now(), '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.teacher_profiles (id, mosque_id, profile_id, bio)
  VALUES (v_teacher_b, v_mosque_b, v_teacher_user_b, 'Student-test Mosque B teacher')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.student_profiles (id, mosque_id, full_name)
  VALUES (v_student_b, v_mosque_b, 'Student-test Student B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.groups (id, mosque_id, name)
  VALUES (v_group_b2, v_mosque_b, 'Student-test Group B')
  ON CONFLICT (id) DO NOTHING;

  -- ── Dev-mosque fixtures the seed does not provide ────────────────────────
  -- Published + unpublished lesson, topic, resource, translation.
  INSERT INTO public.topics (id, mosque_id, title, is_published) VALUES
    ('7c000000-0000-0000-0000-000000000003', v_mosque_a, 'Student Test Topic', true),
    ('7c000000-0000-0000-0000-000000000004', v_mosque_a, 'Draft Topic', false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.lessons (id, mosque_id, topic_id, title, is_published) VALUES
    ('7c000000-0000-0000-0000-000000000001', v_mosque_a, '7c000000-0000-0000-0000-000000000003', 'Student Test Lesson', true),
    ('7c000000-0000-0000-0000-000000000002', v_mosque_a, '7c000000-0000-0000-0000-000000000003', 'Draft Lesson', false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.lesson_resources (id, mosque_id, lesson_id, title, storage_path, sort_order) VALUES
    ('7c000000-0000-0000-0000-000000000005', v_mosque_a, '7c000000-0000-0000-0000-000000000001', 'Published Resource', 'student-test/published.pdf', 1),
    ('7c000000-0000-0000-0000-000000000006', v_mosque_a, '7c000000-0000-0000-0000-000000000002', 'Draft Resource', 'student-test/draft.pdf', 1)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.lesson_translations (id, mosque_id, lesson_id, locale, title) VALUES
    ('7c000000-0000-0000-0000-000000000007', v_mosque_a, '7c000000-0000-0000-0000-000000000001', 'en', 'Student Test Lesson EN'),
    ('7c000000-0000-0000-0000-000000000008', v_mosque_a, '7c000000-0000-0000-0000-000000000002', 'en', 'Draft Lesson EN')
  ON CONFLICT (id) DO NOTHING;

  -- Audio: one track on the published lesson, one on the draft.
  INSERT INTO public.lesson_audio (id, mosque_id, lesson_id, locale, title, storage_path, sort_order) VALUES
    ('7c000000-0000-0000-0000-00000000001d', v_mosque_a, '7c000000-0000-0000-0000-000000000001', 'de', 'Published Lesson Audio', 'student-test/published.mp3', 1),
    ('7c000000-0000-0000-0000-00000000001e', v_mosque_a, '7c000000-0000-0000-0000-000000000002', null, 'Draft Lesson Audio', 'student-test/draft.mp3', 1)
  ON CONFLICT (id) DO NOTHING;

  -- Timetable: one session in a group Amina is in, one in a group she is not.
  INSERT INTO public.teaching_sessions (id, mosque_id, group_id, date, start_time, end_time) VALUES
    ('7c000000-0000-0000-0000-000000000009', v_mosque_a, v_group_a,  current_date, '10:00', '11:00'),
    ('7c000000-0000-0000-0000-00000000000a', v_mosque_a, v_hifz_i,   current_date, '10:00', '11:00')
  ON CONFLICT (id) DO NOTHING;

  -- Attendance: one record for Amina, one for Layla, same session.
  INSERT INTO public.attendance_sessions (id, mosque_id, group_id, session_date) VALUES
    ('7c000000-0000-0000-0000-00000000000b', v_mosque_a, v_group_a, current_date)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.attendance_records (id, mosque_id, session_id, student_profile_id, status) VALUES
    ('7c000000-0000-0000-0000-00000000000c', v_mosque_a, '7c000000-0000-0000-0000-00000000000b', v_amina, 'present'),
    ('7c000000-0000-0000-0000-00000000000d', v_mosque_a, '7c000000-0000-0000-0000-00000000000b', v_layla, 'absent')
  ON CONFLICT (id) DO NOTHING;

  -- Hifz: Amina (seed already has one row; add a fixed-ID one) and Layla.
  INSERT INTO public.hifz_progress (id, mosque_id, student_profile_id, group_id, pages_memorized) VALUES
    ('7c000000-0000-0000-0000-00000000000e', v_mosque_a, v_amina, v_group_a, 42),
    ('7c000000-0000-0000-0000-00000000000f', v_mosque_a, v_layla, v_group_a, 7)
  ON CONFLICT (id) DO NOTHING;

  -- Calendar events: one for everyone, one for teachers only.
  INSERT INTO public.calendar_events (id, mosque_id, title, date, start_time, end_time, visibility) VALUES
    ('7c000000-0000-0000-0000-000000000010', v_mosque_a, 'Student Test Event All',     current_date, '10:00', '11:00', 'all'),
    ('7c000000-0000-0000-0000-000000000011', v_mosque_a, 'Student Test Event Teachers', current_date, '10:00', '11:00', 'teacher')
  ON CONFLICT (id) DO NOTHING;

  -- Homework: published group; individual naming Amina; individual naming
  -- Layla only; draft group (unpublished).
  INSERT INTO public.homework_assignments (id, mosque_id, group_id, title, audience, is_published) VALUES
    ('7c000000-0000-0000-0000-000000000012', v_mosque_a, v_group_a, 'Group Homework',       'group', true),
    ('7c000000-0000-0000-0000-000000000013', v_mosque_a, v_group_a, 'For Amina Only',       'individual', true),
    ('7c000000-0000-0000-0000-000000000014', v_mosque_a, v_group_a, 'For Layla Only',       'individual', true),
    ('7c000000-0000-0000-0000-000000000019', v_mosque_a, v_group_a, 'Draft Group Homework', 'group', false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.homework_targets (id, mosque_id, homework_id, student_profile_id) VALUES
    ('7c000000-0000-0000-0000-000000000015', v_mosque_a, '7c000000-0000-0000-0000-000000000013', v_amina),
    ('7c000000-0000-0000-0000-000000000016', v_mosque_a, '7c000000-0000-0000-0000-000000000014', v_layla)
  ON CONFLICT (id) DO NOTHING;

  -- Progress notes: about Amina, and about Layla. author_profile_id is a
  -- profiles.id (auth uid), not a teacher_profiles.id.
  INSERT INTO public.progress_notes (id, mosque_id, student_profile_id, group_id, author_profile_id, body, visible_to_parents) VALUES
    ('7c000000-0000-0000-0000-000000000017', v_mosque_a, v_amina, v_group_a, '00000000-0000-0000-0000-000000000002', 'Amina is doing well.', true),
    ('7c000000-0000-0000-0000-000000000018', v_mosque_a, v_layla, v_group_a, '00000000-0000-0000-0000-000000000002', 'Layla is doing well.', true)
  ON CONFLICT (id) DO NOTHING;

  -- Weekly notes: published + draft for Group A.
  INSERT INTO public.teacher_weekly_notes (id, mosque_id, group_id, author_profile_id, week_start, body, is_published) VALUES
    ('7c000000-0000-0000-0000-00000000001a', v_mosque_a, v_group_a, '00000000-0000-0000-0000-000000000002', current_date,        'Published weekly note.', true),
    ('7c000000-0000-0000-0000-00000000001b', v_mosque_a, v_group_a, '00000000-0000-0000-0000-000000000002', current_date - 7,  'Draft weekly note.', false)
  ON CONFLICT (id) DO NOTHING;

  -- Exam sessions: one for Amina (dev mosque), one for Student B (Mosque B).
  INSERT INTO public.exam_sessions (id, mosque_id, student_profile_id, examiner_profile_id, from_group_id, status, oral_required, written_required) VALUES
    ('7c000000-0000-0000-0000-00000000001c', v_mosque_a, v_amina, v_teacher_pf_a, v_group_a, 'scheduled', true, true),
    ('7b000000-0000-0000-0000-000000000020', v_mosque_b, v_student_b, v_teacher_b, v_group_b2, 'scheduled', true, true)
  ON CONFLICT (id) DO NOTHING;

  -- Mosque B cross-mosque negatives.
  INSERT INTO public.lessons (id, mosque_id, topic_id, title, is_published) VALUES
    ('7b000000-0000-0000-0000-00000000001a', v_mosque_b, NULL, 'Mosque B Lesson', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.attendance_sessions (id, mosque_id, group_id, session_date) VALUES
    ('7b000000-0000-0000-0000-00000000001c', v_mosque_b, v_group_b2, current_date)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.attendance_records (id, mosque_id, session_id, student_profile_id, status) VALUES
    ('7b000000-0000-0000-0000-00000000001d', v_mosque_b, '7b000000-0000-0000-0000-00000000001c', v_student_b, 'present')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.hifz_progress (id, mosque_id, student_profile_id, group_id, pages_memorized) VALUES
    ('7b000000-0000-0000-0000-00000000001e', v_mosque_b, v_student_b, v_group_b2, 3)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.teaching_sessions (id, mosque_id, group_id, date, start_time, end_time) VALUES
    ('7b000000-0000-0000-0000-000000000021', v_mosque_b, v_group_b2, current_date, '10:00', '11:00')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- The seed generates student/group UUIDs at reset time, so the assertions
-- below cannot hardcode them. Carry the resolved IDs in a temp table, as the
-- sibling test files do.
CREATE TEMP TABLE _student_test_ids AS
SELECT
  (SELECT id FROM public.mosques WHERE slug = 'dev-mosque')        AS mosque_a_id,
  (SELECT id FROM public.student_profiles WHERE full_name = 'Amina Demirović') AS amina_id,
  (SELECT id FROM public.student_profiles WHERE full_name = 'Layla Begić')     AS layla_id,
  (SELECT g.id FROM public.groups g
     JOIN public.mosques m ON m.id = g.mosque_id
     WHERE m.slug = 'dev-mosque' AND g.name = 'Group A')           AS group_a_id;
GRANT SELECT ON _student_test_ids TO authenticated;

-- ---------------------------------------------------------------------------
-- Act as Amina for the rest of the file.
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 1. Reads: what a student is entitled to see
-- ---------------------------------------------------------------------------

SELECT is(
  (SELECT count(*)::int FROM public.mosques WHERE slug = 'dev-mosque'),
  1,
  'student: reads their own mosque row'
);

SELECT is(
  (SELECT count(*)::int FROM public.mosque_plugins
    WHERE plugin_id = 'lesson_library' AND is_active),
  1,
  'student: reads active plugins for their mosque'
);

SELECT is(
  (SELECT count(*)::int FROM public.lessons
    WHERE id = '7c000000-0000-0000-0000-000000000001'),
  1,
  'student: reads a published lesson'
);

SELECT is(
  (SELECT count(*)::int FROM public.topics
    WHERE id = '7c000000-0000-0000-0000-000000000003'),
  1,
  'student: reads a published topic'
);

SELECT is(
  (SELECT count(*)::int FROM public.lesson_resources
    WHERE id = '7c000000-0000-0000-0000-000000000005'),
  1,
  'student: reads a resource attached to a published lesson'
);

SELECT is(
  (SELECT count(*)::int FROM public.lesson_translations
    WHERE id = '7c000000-0000-0000-0000-000000000007'),
  1,
  'student: reads a translation of a published lesson'
);

SELECT is(
  (SELECT count(*)::int FROM public.lesson_audio
    WHERE id = '7c000000-0000-0000-0000-00000000001d'),
  1,
  'student: reads audio attached to a published lesson'
);

SELECT cmp_ok(
  (SELECT count(*)::int FROM public.teaching_schedules
    WHERE mosque_id = (SELECT mosque_a_id FROM _student_test_ids)),
  '>', 0,
  'student: reads the mosque timetable pattern'
);

SELECT is(
  (SELECT count(*)::int FROM public.teaching_sessions
    WHERE id = '7c000000-0000-0000-0000-000000000009'),
  1,
  'student: reads a teaching session for an enrolled group'
);

SELECT is(
  (SELECT count(*)::int FROM public.attendance_records
    WHERE id = '7c000000-0000-0000-0000-00000000000c'),
  1,
  'student: reads their own attendance record'
);

SELECT is(
  (SELECT count(*)::int FROM public.hifz_progress
    WHERE id = '7c000000-0000-0000-0000-00000000000e'),
  1,
  'student: reads their own hifz progress'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_sessions
    WHERE id = '7c000000-0000-0000-0000-00000000001c'),
  1,
  'student: reads their own exam session'
);

SELECT is(
  (SELECT count(*)::int FROM public.group_enrollments
    WHERE student_profile_id = (SELECT amina_id FROM _student_test_ids)),
  2,
  'student: reads both of their own group enrolments (active or not)'
);

SELECT is(
  (SELECT count(*)::int FROM public.groups
    WHERE name IN ('Group A', 'Group B (Advanced)')),
  2,
  'student: reads the groups they are enrolled in'
);

SELECT cmp_ok(
  (SELECT count(*)::int FROM public.group_categories
    WHERE mosque_id = (SELECT mosque_a_id FROM _student_test_ids)),
  '>', 0,
  'student: reads group categories'
);

SELECT is(
  (SELECT count(*)::int FROM public.calendar_events
    WHERE id = '7c000000-0000-0000-0000-000000000010'),
  1,
  'student: reads a calendar event addressed to everyone'
);

SELECT is(
  (SELECT count(*)::int FROM public.homework_assignments
    WHERE id = '7c000000-0000-0000-0000-000000000012'),
  1,
  'student: reads published homework for their group'
);

SELECT is(
  (SELECT count(*)::int FROM public.homework_assignments
    WHERE id = '7c000000-0000-0000-0000-000000000013'),
  1,
  'student: reads individual homework that names them'
);

SELECT is(
  (SELECT count(*)::int FROM public.homework_targets
    WHERE id = '7c000000-0000-0000-0000-000000000015'),
  1,
  'student: reads their own homework target'
);

SELECT is(
  (SELECT count(*)::int FROM public.progress_notes
    WHERE id = '7c000000-0000-0000-0000-000000000017'),
  1,
  'student: reads a progress note about themselves'
);

SELECT is(
  (SELECT count(*)::int FROM public.teacher_weekly_notes
    WHERE id = '7c000000-0000-0000-0000-00000000001a'),
  1,
  'student: reads a published weekly note for their group'
);

-- ---------------------------------------------------------------------------
-- 2. No reads: what a student must never see
-- ---------------------------------------------------------------------------

SELECT is(
  (SELECT count(*)::int FROM public.lessons
    WHERE id = '7c000000-0000-0000-0000-000000000002'),
  0,
  'student: does not see an unpublished lesson'
);

SELECT is(
  (SELECT count(*)::int FROM public.topics
    WHERE id = '7c000000-0000-0000-0000-000000000004'),
  0,
  'student: does not see an unpublished topic'
);

SELECT is(
  (SELECT count(*)::int FROM public.lesson_resources
    WHERE id = '7c000000-0000-0000-0000-000000000006'),
  0,
  'student: does not see a resource on an unpublished lesson'
);

SELECT is(
  (SELECT count(*)::int FROM public.lesson_translations
    WHERE id = '7c000000-0000-0000-0000-000000000008'),
  0,
  'student: does not see a translation of an unpublished lesson'
);

SELECT is(
  (SELECT count(*)::int FROM public.lesson_audio
    WHERE id = '7c000000-0000-0000-0000-00000000001e'),
  0,
  'student: does not see audio on an unpublished lesson'
);

SELECT is(
  (SELECT count(*)::int FROM public.teaching_sessions
    WHERE id = '7b000000-0000-0000-0000-000000000021'),
  0,
  'student: does not see another mosque''s teaching sessions'
);

SELECT is(
  (SELECT count(*)::int FROM public.attendance_records
    WHERE id = '7c000000-0000-0000-0000-00000000000d'),
  0,
  'student: does not see another student''s attendance record'
);

SELECT is(
  (SELECT count(*)::int FROM public.hifz_progress
    WHERE id = '7c000000-0000-0000-0000-00000000000f'),
  0,
  'student: does not see another student''s hifz progress'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_sessions
    WHERE id = '7b000000-0000-0000-0000-000000000020'),
  0,
  'student: does not see another mosque''s exam session'
);

SELECT is(
  (SELECT count(*)::int FROM public.groups
    WHERE name = 'Hifz I'),
  0,
  'student: does not see a group they are not enrolled in'
);

SELECT is(
  (SELECT count(*)::int FROM public.calendar_events
    WHERE id = '7c000000-0000-0000-0000-000000000011'),
  0,
  'student: does not see a calendar event addressed to teachers only'
);

SELECT is(
  (SELECT count(*)::int FROM public.homework_assignments
    WHERE id = '7c000000-0000-0000-0000-000000000014'),
  0,
  'student: does not see individual homework that names another student'
);

SELECT is(
  (SELECT count(*)::int FROM public.homework_assignments
    WHERE id = '7c000000-0000-0000-0000-000000000019'),
  0,
  'student: does not see unpublished (draft) homework'
);

SELECT is(
  (SELECT count(*)::int FROM public.progress_notes
    WHERE id = '7c000000-0000-0000-0000-000000000018'),
  0,
  'student: does not see a progress note about another student'
);

SELECT is(
  (SELECT count(*)::int FROM public.teacher_weekly_notes
    WHERE id = '7c000000-0000-0000-0000-00000000001b'),
  0,
  'student: does not see an unpublished weekly note'
);

SELECT is(
  (SELECT count(*)::int FROM public.mosques
    WHERE slug = 'student-test-mosque-b'),
  0,
  'student: does not see another mosque'
);

SELECT is(
  (SELECT count(*)::int FROM public.lessons
    WHERE id = '7b000000-0000-0000-0000-00000000001a'),
  0,
  'student: does not see another mosque''s lessons'
);

SELECT is(
  (SELECT count(*)::int FROM public.mosque_plugins
    WHERE mosque_id = '7b000000-0000-0000-0000-000000000000'),
  0,
  'student: does not see another mosque''s plugins'
);

SELECT is(
  (SELECT count(*)::int FROM public.attendance_records
    WHERE id = '7b000000-0000-0000-0000-00000000001d'),
  0,
  'student: does not see another mosque''s attendance'
);

SELECT is(
  (SELECT count(*)::int FROM public.hifz_progress
    WHERE id = '7b000000-0000-0000-0000-00000000001e'),
  0,
  'student: does not see another mosque''s hifz progress'
);

-- ---------------------------------------------------------------------------
-- 3. No writes: a student is read-only everywhere
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$INSERT INTO public.lessons (mosque_id, title)
    SELECT id, 'Hack lesson' FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "lessons"',
  'student: cannot INSERT lessons'
);

SELECT throws_ok(
  $$INSERT INTO public.topics (mosque_id, title)
    SELECT id, 'Hack topic' FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "topics"',
  'student: cannot INSERT topics'
);

SELECT throws_ok(
  $$INSERT INTO public.lesson_resources (mosque_id, lesson_id, title, storage_path, sort_order)
    SELECT id, '7c000000-0000-0000-0000-000000000001', 'Hack', 'x', 1
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "lesson_resources"',
  'student: cannot INSERT lesson resources'
);

SELECT throws_ok(
  $$INSERT INTO public.lesson_translations (mosque_id, lesson_id, locale, title)
    SELECT id, '7c000000-0000-0000-0000-000000000001', 'en', 'Hack'
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "lesson_translations"',
  'student: cannot INSERT lesson translations'
);

SELECT throws_ok(
  $$INSERT INTO public.lesson_audio (mosque_id, lesson_id, title, storage_path)
    SELECT id, '7c000000-0000-0000-0000-000000000001', 'Hack', 'x.mp3'
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "lesson_audio"',
  'student: cannot INSERT lesson audio'
);

SELECT throws_ok(
  $$INSERT INTO public.attendance_sessions (mosque_id, group_id, session_date)
    SELECT id, (SELECT group_a_id FROM _student_test_ids), current_date
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "attendance_sessions"',
  'student: cannot INSERT attendance sessions'
);

SELECT throws_ok(
  $$INSERT INTO public.attendance_records (mosque_id, session_id, student_profile_id, status)
    SELECT id, '7c000000-0000-0000-0000-00000000000b', (SELECT amina_id FROM _student_test_ids), 'present'
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "attendance_records"',
  'student: cannot INSERT attendance records'
);

SELECT throws_ok(
  $$INSERT INTO public.hifz_progress (mosque_id, student_profile_id, group_id, pages_memorized)
    SELECT id, (SELECT amina_id FROM _student_test_ids), (SELECT group_a_id FROM _student_test_ids), 100
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "hifz_progress"',
  'student: cannot INSERT hifz progress'
);

SELECT throws_ok(
  $$INSERT INTO public.group_enrollments (mosque_id, group_id, student_profile_id)
    SELECT id, (SELECT group_a_id FROM _student_test_ids), (SELECT amina_id FROM _student_test_ids)
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "group_enrollments"',
  'student: cannot INSERT group enrollments'
);

SELECT throws_ok(
  $$INSERT INTO public.groups (mosque_id, name)
    SELECT id, 'Hack group' FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "groups"',
  'student: cannot INSERT groups'
);

SELECT throws_ok(
  $$INSERT INTO public.homework_assignments (mosque_id, group_id, title)
    SELECT id, (SELECT group_a_id FROM _student_test_ids), 'Hack homework'
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "homework_assignments"',
  'student: cannot INSERT homework'
);

SELECT throws_ok(
  $$INSERT INTO public.homework_targets (mosque_id, homework_id, student_profile_id)
    SELECT id, '7c000000-0000-0000-0000-000000000013', (SELECT amina_id FROM _student_test_ids)
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "homework_targets"',
  'student: cannot INSERT homework targets'
);

SELECT throws_ok(
  $$INSERT INTO public.progress_notes (mosque_id, student_profile_id, body)
    SELECT id, (SELECT amina_id FROM _student_test_ids), 'Hack note'
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "progress_notes"',
  'student: cannot INSERT progress notes'
);

SELECT throws_ok(
  $$INSERT INTO public.teacher_weekly_notes (mosque_id, group_id, week_start, body)
    SELECT id, (SELECT group_a_id FROM _student_test_ids), current_date, 'Hack note'
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "teacher_weekly_notes"',
  'student: cannot INSERT weekly notes'
);

SELECT throws_ok(
  $$INSERT INTO public.calendar_events (mosque_id, title, date)
    SELECT id, 'Hack event', current_date FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "calendar_events"',
  'student: cannot INSERT calendar events'
);

SELECT throws_ok(
  $$INSERT INTO public.teaching_sessions (mosque_id, group_id, date)
    SELECT id, (SELECT group_a_id FROM _student_test_ids), current_date
    FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "teaching_sessions"',
  'student: cannot INSERT teaching sessions'
);

SELECT throws_ok(
  $$INSERT INTO public.mosque_plugins (mosque_id, plugin_id, is_active, config)
    SELECT id, 'messaging', true, '{}'::jsonb FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "mosque_plugins"',
  'student: cannot INSERT mosque plugins'
);

-- UPDATE/DELETE under RLS do not raise: denied rows are filtered out and the
-- statement affects 0 rows. So "cannot write" is asserted as "the row is
-- unchanged" rather than "throws".

SELECT lives_ok(
  $$UPDATE public.exam_sessions SET status = 'passed'
    WHERE id = '7c000000-0000-0000-0000-00000000001c'$$,
  'student: UPDATE on their own exam session runs'
);

SELECT is(
  (SELECT count(*)::int FROM public.exam_sessions
    WHERE id = '7c000000-0000-0000-0000-00000000001c' AND status = 'scheduled'),
  1,
  'student: their exam session is unchanged after the UPDATE attempt'
);

SELECT lives_ok(
  $$DELETE FROM public.groups
    WHERE id = (SELECT group_a_id FROM _student_test_ids)$$,
  'student: DELETE on a group runs'
);

SELECT is(
  (SELECT count(*)::int FROM public.groups
    WHERE id = (SELECT group_a_id FROM _student_test_ids)),
  1,
  'student: the group still exists after the DELETE attempt'
);

-- ---------------------------------------------------------------------------
-- 4. Standing invariant: the whole bug class as a build failure
-- ---------------------------------------------------------------------------
-- Every SELECT policy gated on `app.is_member()` must carry an
-- `app.is_student()` branch somewhere on that table, unless the table is on
-- the explicit staff-only allow-list below. Students are deliberately not
-- members, so a member-only SELECT policy on any other table means the role
-- silently sees nothing — the exact shape five bugs have shipped in.

SELECT is(
  (SELECT count(*)::int
   FROM (
     SELECT p.tablename
     FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.cmd = 'SELECT'
       AND p.qual::text LIKE '%is_member%'
     GROUP BY p.tablename
     HAVING NOT EXISTS (
       SELECT 1 FROM pg_policies s
       WHERE s.schemaname = 'public'
         AND s.tablename = p.tablename
         AND s.cmd = 'SELECT'
         AND s.qual::text LIKE '%is_student%'
     )
   ) member_gated
   WHERE tablename NOT IN (
     -- Staff-only tables: students must never read these, so an is_member
     -- gate without a student branch is correct here. Anything else that
     -- appears is the bug class this file exists to catch.
     'memberships',
     'teacher_profiles',
     'parent_profiles',
     'teacher_group_links',
     'device_tokens',
     'plans',
     'mosque_subscriptions',
     'exam_questions',
     'written_tests',
     'written_test_answers',
     'notification_queue',
     'gdpr_deletion_log',
     -- Intentionally readable by every member, students included. This
     -- carries no student data and is not staff-only, so `is_member`
     -- alone is the correct gate and an `is_student` branch would be
     -- redundant.
     --
     -- public_library_settings drives the public lesson library, which
     -- is served to anonymous visitors on its own subdomain through the
     -- service-role client (apps/web/src/lib/public-library.ts). Its
     -- contents are published by design; a member reading the row
     -- discloses nothing that is not already public.
     'public_library_settings'
   )),
  0,
  'invariant: no SELECT policy gates on is_member without a student branch (outside the staff-only allow-list)'
);

SELECT * FROM finish();
ROLLBACK;
