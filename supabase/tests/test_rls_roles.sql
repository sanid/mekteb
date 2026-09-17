-- pgTAP: role-based access tests within a single mosque.
--
-- Verifies parent visibility rules, teacher write permissions, and
-- that lower-privileged roles cannot perform admin-only mutations.
--
-- Run with: supabase test db

BEGIN;
SELECT plan(24);

-- ---------------------------------------------------------------------------
-- Setup: add test data on top of seed using fixed IDs.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_id     uuid;
  v_teacher_pf    uuid;
  v_parent_pf     uuid;
  v_student_amina uuid;
  v_group_a       uuid;
BEGIN
  SELECT id INTO v_mosque_id FROM public.mosques WHERE slug = 'dev-mosque';
  SELECT id INTO v_teacher_pf FROM public.teacher_profiles WHERE profile_id = '00000000-0000-0000-0000-000000000002';
  SELECT id INTO v_parent_pf  FROM public.parent_profiles  WHERE profile_id = '00000000-0000-0000-0000-000000000003';
  SELECT id INTO v_student_amina FROM public.student_profiles WHERE full_name = 'Amina Demirović';
  SELECT id INTO v_group_a FROM public.groups WHERE mosque_id = v_mosque_id AND name = 'Group A';

  -- Re-activate Amina's Group A enrollment (seed promotes her to Group B, setting
  -- is_active = false on the Group A row).  Undo this so teacher/parent RLS passes.
  UPDATE public.group_enrollments
    SET is_active = true
    WHERE student_profile_id = v_student_amina AND group_id = v_group_a;

  -- Progress note visible to parents
  INSERT INTO public.progress_notes (id, mosque_id, student_profile_id, group_id, author_profile_id, body, visible_to_parents)
  VALUES (
    '7e000001-0000-0000-0000-000000000001'::uuid,
    v_mosque_id, v_student_amina, v_group_a,
    '00000000-0000-0000-0000-000000000002',
    'Amina is progressing well.',
    true
  );

  -- Progress note NOT visible to parents
  INSERT INTO public.progress_notes (id, mosque_id, student_profile_id, group_id, author_profile_id, body, visible_to_parents)
  VALUES (
    '7e000001-0000-0000-0000-000000000002'::uuid,
    v_mosque_id, v_student_amina, v_group_a,
    '00000000-0000-0000-0000-000000000002',
    'Internal observation — not for parents.',
    false
  );

  -- Group homework (audience=group)
  INSERT INTO public.homework_assignments (id, mosque_id, group_id, title, audience, is_published)
  VALUES (
    '7e000002-0000-0000-0000-000000000001'::uuid,
    v_mosque_id, v_group_a,
    'Test Homework', 'group', true
  );

  -- Draft (unpublished) homework — parents must not see it
  INSERT INTO public.homework_assignments (id, mosque_id, group_id, title, audience, is_published)
  VALUES (
    '7e000002-0000-0000-0000-000000000002'::uuid,
    v_mosque_id, v_group_a,
    'Draft Homework', 'group', false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Parent visibility: progress_notes
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.progress_notes
    WHERE id IN (
      '7e000001-0000-0000-0000-000000000001'::uuid,
      '7e000001-0000-0000-0000-000000000002'::uuid
    )),
  1,
  'parent: sees only the 1 note flagged visible_to_parents=true'
);

SELECT is(
  (SELECT visible_to_parents FROM public.progress_notes
    WHERE id = '7e000001-0000-0000-0000-000000000001'::uuid),
  true,
  'parent: the visible note has visible_to_parents=true'
);

SELECT is(
  (SELECT count(*)::int FROM public.progress_notes
    WHERE id = '7e000001-0000-0000-0000-000000000002'::uuid),
  0,
  'parent: internal note is not visible'
);

-- Parent cannot write progress notes
SELECT throws_ok(
  $$INSERT INTO public.progress_notes (mosque_id, student_profile_id, body, visible_to_parents)
    SELECT mosque_id, id, 'Hack note', true FROM public.student_profiles LIMIT 1$$,
  'new row violates row-level security policy for table "progress_notes"',
  'parent: cannot INSERT progress notes'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Teacher: can read + write progress notes for students in their mosque
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.progress_notes
    WHERE id IN (
      '7e000001-0000-0000-0000-000000000001'::uuid,
      '7e000001-0000-0000-0000-000000000002'::uuid
    )),
  2,
  'teacher: sees both notes (including internal)'
);

-- Teacher can insert a note (this should succeed; we test by catching no exception)
SELECT lives_ok(
  $$INSERT INTO public.progress_notes (mosque_id, student_profile_id, body, visible_to_parents)
    SELECT mosque_id, id, 'Teacher test note', false
    FROM public.student_profiles WHERE full_name = 'Amina Demirović' LIMIT 1$$,
  'teacher: can INSERT a progress note'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2b. Teacher can manage their own notes even when the student's enrolment
--     went inactive (seed: Amina is promoted to Group B, so her Group A
--     enrolment is inactive). Regression for the author branch of the
--     progress_notes policies — without it, teacher_has_student() is false
--     and the author loses UPDATE/DELETE (and even SELECT) access to their
--     own notes.
-- ---------------------------------------------------------------------------

-- Re-deactivate Amina's Group A enrolment — the state the seed leaves, which
-- section 2a re-activated for its own assertions.
DO $$
DECLARE v_mosque_id uuid; v_student_amina uuid; v_group_a uuid;
BEGIN
  SELECT id INTO v_mosque_id FROM public.mosques WHERE slug = 'dev-mosque';
  SELECT id INTO v_student_amina FROM public.student_profiles WHERE full_name = 'Amina Demirović';
  SELECT id INTO v_group_a FROM public.groups WHERE mosque_id = v_mosque_id AND name = 'Group A';
  UPDATE public.group_enrollments SET is_active = false
    WHERE student_profile_id = v_student_amina AND group_id = v_group_a;
END $$;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

-- INSERT passes only via the author branch (author = self AND teacher of Group A);
-- teacher_has_student() is false here.
SELECT lives_ok(
  $$INSERT INTO public.progress_notes (mosque_id, group_id, student_profile_id, author_profile_id, body, visible_to_parents)
    SELECT m.id,
           (SELECT g.id FROM public.groups g WHERE g.mosque_id = m.id AND g.name = 'Group A' LIMIT 1),
           (SELECT s.id FROM public.student_profiles s WHERE s.mosque_id = m.id AND s.full_name = 'Amina Demirović' LIMIT 1),
           '00000000-0000-0000-0000-000000000002',
           'orphan-note-regression', false
    FROM public.mosques m
    WHERE m.slug = 'dev-mosque'
    LIMIT 1$$,
  'teacher: can INSERT own note with inactive enrolment (author branch)'
);

SELECT lives_ok(
  $$UPDATE public.progress_notes SET body = 'orphan-note-updated', updated_at = now()
    WHERE body = 'orphan-note-regression'
      AND author_profile_id = '00000000-0000-0000-0000-000000000002'$$,
  'teacher: can UPDATE own note about a student with inactive enrolment'
);

SELECT is(
  (SELECT count(*)::int FROM public.progress_notes WHERE body = 'orphan-note-updated'),
  1,
  'teacher: the update actually landed'
);

SELECT lives_ok(
  $$DELETE FROM public.progress_notes WHERE body = 'orphan-note-updated'$$,
  'teacher: can DELETE own note about a student with inactive enrolment'
);

SELECT is(
  (SELECT count(*)::int FROM public.progress_notes WHERE body = 'orphan-note-updated'),
  0,
  'teacher: the delete actually landed'
);

RESET ROLE;

-- Restore Amina's enrolment for any later tests.
DO $$
DECLARE v_mosque_id uuid; v_student_amina uuid; v_group_a uuid;
BEGIN
  SELECT id INTO v_mosque_id FROM public.mosques WHERE slug = 'dev-mosque';
  SELECT id INTO v_student_amina FROM public.student_profiles WHERE full_name = 'Amina Demirović';
  SELECT id INTO v_group_a FROM public.groups WHERE mosque_id = v_mosque_id AND name = 'Group A';
  UPDATE public.group_enrollments SET is_active = true
    WHERE student_profile_id = v_student_amina AND group_id = v_group_a;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Admin-only operations: parent and teacher cannot create groups
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.groups (mosque_id, name)
    SELECT id, 'Parent Created Group' FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "groups"',
  'parent: cannot INSERT a group'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.groups (mosque_id, name)
    SELECT id, 'Teacher Created Group' FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'new row violates row-level security policy for table "groups"',
  'teacher: cannot INSERT a group'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Admin can create groups in their mosque
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.groups (mosque_id, name)
    SELECT id, 'Admin Created Group' FROM public.mosques WHERE slug = 'dev-mosque'$$,
  'admin: can INSERT a group in their mosque'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. Published vs draft homework visibility for parent
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.homework_assignments
    WHERE id = '7e000002-0000-0000-0000-000000000001'::uuid),
  1,
  'parent: sees published homework for their child''s group'
);

SELECT is(
  (SELECT count(*)::int FROM public.homework_assignments
    WHERE id = '7e000002-0000-0000-0000-000000000002'::uuid),
  0,
  'parent: does not see draft (unpublished) homework'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. Parent cannot modify their own parent_student_links to add other students
-- ---------------------------------------------------------------------------
-- The parent can't see Layla through student_profiles RLS, so a subquery
-- approach would insert 0 rows and raise no exception.  Look up Layla's ID
-- as superuser first (into a temp table), then attempt the INSERT with the
-- known UUID so the RLS WITH CHECK is actually exercised.

RESET ROLE;
CREATE TEMP TABLE _pgtap_ids AS
  SELECT id AS layla_id
  FROM public.student_profiles
  WHERE full_name = 'Layla Begić'
  LIMIT 1;
GRANT SELECT ON _pgtap_ids TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

-- The BEFORE trigger (check_parent_student_link_mosque) fires before the RLS WITH CHECK.
-- It queries student_profiles as the parent user; Layla is filtered out by RLS so
-- student_mosque = NULL, which is DISTINCT from mosque_id → trigger rejects the row.
SELECT throws_ok(
  $$INSERT INTO public.parent_student_links (mosque_id, parent_profile_id, student_profile_id)
    SELECT pp.mosque_id, pp.id, (SELECT layla_id FROM _pgtap_ids)
    FROM public.parent_profiles pp
    WHERE pp.profile_id = '00000000-0000-0000-0000-000000000003'
    LIMIT 1$$,
  'parent_student_links: mosque_id must match both parent and student mosques',
  'parent: cannot self-enroll their account to link additional students'
);

RESET ROLE;
DROP TABLE _pgtap_ids;

-- ---------------------------------------------------------------------------
-- 7. Teacher can read parent contact details (profiles_teacher_parent_select)
-- ---------------------------------------------------------------------------
-- Regression for 20260809120000_teacher_reads_parent_contacts: the teacher
-- group page always queried `profiles(full_name, phone)` for parents, but
-- profiles RLS was self-only, so the join came back NULL. The teacher branch
-- lets a teacher read the profile of any parent linked to a student in one
-- of their groups.

RESET ROLE;
CREATE TEMP TABLE _pgtap_teacher_ids AS
  SELECT
    pp.id AS parent_pf_id,
    pp.profile_id AS parent_user_id
  FROM public.parent_profiles pp
  WHERE pp.profile_id = '00000000-0000-0000-0000-000000000003'
  LIMIT 1;
GRANT SELECT ON _pgtap_teacher_ids TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

-- teacher@local.test teaches Group A; parent@local.test is linked to Amina
-- (enrolled in Group A), so the teacher may read that parent's profile.
SELECT is(
  (SELECT count(*)::int FROM public.profiles
    WHERE id = (SELECT parent_user_id FROM _pgtap_teacher_ids)),
  1,
  'teacher: can read the profile of a parent whose child they teach'
);

-- A teacher must not read a profile with no parent link to their students.
-- (The dev-mosque admin holds no parent link.)
SELECT is(
  (SELECT count(*)::int FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-000000000001'),
  0,
  'teacher: cannot read an arbitrary profile with no parent link to their students'
);

-- The parent profile row itself is still readable to the teacher via the
-- parent_profiles admin-only policy? No — parent_profiles_select is admin
-- or self. The teacher sees the linked parent_profiles row only through
-- parent_student_links (teacher_group_links branch). Assert the link row.
SELECT is(
  (SELECT count(*)::int FROM public.parent_student_links psl
    JOIN _pgtap_teacher_ids t ON t.parent_pf_id = psl.parent_profile_id),
  1,
  'teacher: sees the parent link for their student'
);

RESET ROLE;
DROP TABLE _pgtap_teacher_ids;

-- ---------------------------------------------------------------------------
-- 8. Teacher can write lesson translations (teacher write translations)
-- ---------------------------------------------------------------------------
-- Regression for 20260809160000_teacher_writes_lesson_translations: lessons
-- have always been teacher-editable, but lesson_translations only carried an
-- admin write policy, so the teacher portal's translation editor would have
-- failed on every save.

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.lesson_translations (mosque_id, lesson_id, locale, title)
    SELECT m.id, l.id, 'en', 'Teacher translation'
    FROM public.mosques m
    CROSS JOIN public.lessons l
    WHERE m.slug = 'dev-mosque'
      AND l.mosque_id = m.id
      AND l.is_published
    LIMIT 1
  ON CONFLICT (lesson_id, locale) DO NOTHING$$,
  'teacher: can INSERT a lesson translation'
);

SELECT lives_ok(
  $$INSERT INTO public.lesson_audio (mosque_id, lesson_id, title, storage_path)
    SELECT m.id, l.id, 'Teacher audio', 'teacher.mp3'
    FROM public.mosques m
    CROSS JOIN public.lessons l
    WHERE m.slug = 'dev-mosque'
      AND l.mosque_id = m.id
      AND l.is_published
    LIMIT 1$$,
  'teacher: can INSERT lesson audio'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.lesson_translations (mosque_id, lesson_id, locale, title)
    SELECT m.id, l.id, 'en', 'Parent hack'
    FROM public.mosques m
    CROSS JOIN public.lessons l
    WHERE m.slug = 'dev-mosque'
      AND l.mosque_id = m.id
      AND l.is_published
    LIMIT 1$$,
  'new row violates row-level security policy for table "lesson_translations"',
  'parent: cannot INSERT lesson translations'
);

SELECT throws_ok(
  $$INSERT INTO public.lesson_audio (mosque_id, lesson_id, title, storage_path)
    SELECT m.id, l.id, 'Parent hack', 'x.mp3'
    FROM public.mosques m
    CROSS JOIN public.lessons l
    WHERE m.slug = 'dev-mosque'
      AND l.mosque_id = m.id
      AND l.is_published
    LIMIT 1$$,
  'new row violates row-level security policy for table "lesson_audio"',
  'parent: cannot INSERT lesson audio'
);

RESET ROLE;

-- ---------------------------------------------------------------------------

SELECT * FROM finish();
ROLLBACK;
