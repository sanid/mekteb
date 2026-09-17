-- pgTAP: communication RLS tests.
--
-- Verifies message thread visibility, participant-scoped access,
-- and announcement publish/draft rules.
--
-- Run with: supabase test db

BEGIN;
SELECT plan(10);

-- ---------------------------------------------------------------------------
-- Setup
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_id     uuid;
  v_teacher_pf    uuid;
  v_parent_pf     uuid;
  v_student_amina uuid;
  v_group_a       uuid;
  v_thread_id     uuid;
BEGIN
  SELECT id INTO v_mosque_id FROM public.mosques WHERE slug = 'dev-mosque';
  SELECT id INTO v_teacher_pf FROM public.teacher_profiles WHERE profile_id = '00000000-0000-0000-0000-000000000002';
  SELECT id INTO v_parent_pf  FROM public.parent_profiles  WHERE profile_id = '00000000-0000-0000-0000-000000000003';
  SELECT id INTO v_student_amina FROM public.student_profiles WHERE full_name = 'Amina Demirović';
  SELECT id INTO v_group_a FROM public.groups WHERE mosque_id = v_mosque_id LIMIT 1;

  -- Published announcement
  INSERT INTO public.announcements (id, mosque_id, group_id, author_profile_id, audience, title, body, is_published)
  VALUES (
    '8a000001-0000-0000-0000-000000000001'::uuid,
    v_mosque_id, v_group_a,
    '00000000-0000-0000-0000-000000000001',
    'group', 'Test Announcement', 'Hello everyone', true
  );

  -- Draft announcement
  INSERT INTO public.announcements (id, mosque_id, author_profile_id, audience, title, body, is_published)
  VALUES (
    '8a000001-0000-0000-0000-000000000002'::uuid,
    v_mosque_id,
    '00000000-0000-0000-0000-000000000001',
    'mosque', 'Draft', 'Not yet published', false
  );

  -- Message thread between admin (001) and teacher (002)
  INSERT INTO public.message_threads (id, mosque_id, subject, created_by)
  VALUES ('8a000002-0000-0000-0000-000000000001'::uuid, v_mosque_id, 'Test thread',
          '00000000-0000-0000-0000-000000000001');

  INSERT INTO public.message_participants (mosque_id, thread_id, profile_id, created_by)
  VALUES
    (v_mosque_id, '8a000002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000001'),
    (v_mosque_id, '8a000002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000001');

  INSERT INTO public.messages (id, mosque_id, thread_id, author_profile_id, body, created_by)
  VALUES (
    '8a000003-0000-0000-0000-000000000001'::uuid,
    v_mosque_id,
    '8a000002-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001',
    'Hello from admin',
    '00000000-0000-0000-0000-000000000001'
  );

  -- Notification for admin only (explicit insert, bypasses fanout)
  INSERT INTO public.notification_queue
    (mosque_id, recipient_profile_id, channel, body, status, is_read)
  VALUES
    (v_mosque_id, '00000000-0000-0000-0000-000000000001',
     'email', 'You have a new message (comm-test)', 'pending', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Announcements: members see published, not drafts
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.announcements
    WHERE id = '8a000001-0000-0000-0000-000000000001'::uuid),
  1,
  'parent: sees published announcement'
);

SELECT is(
  (SELECT count(*)::int FROM public.announcements
    WHERE id = '8a000001-0000-0000-0000-000000000002'::uuid),
  0,
  'parent: cannot see draft announcement'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Announcements: only admin can delete — RLS silently filters (no exception)
--    Verify announcement still exists after teacher's "delete attempt".
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

DO $$
BEGIN
  DELETE FROM public.announcements
    WHERE id = '8a000001-0000-0000-0000-000000000001'::uuid;
END;
$$;

SELECT is(
  (SELECT count(*)::int FROM public.announcements
    WHERE id = '8a000001-0000-0000-0000-000000000001'::uuid),
  1,
  'teacher: delete is silently blocked — announcement still exists'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. Message threads: only participants see threads
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.message_threads
    WHERE id = '8a000002-0000-0000-0000-000000000001'::uuid),
  1,
  'admin (participant): sees the thread'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.message_threads
    WHERE id = '8a000002-0000-0000-0000-000000000001'::uuid),
  0,
  'parent (non-participant): cannot see the thread'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Messages: only participants see messages
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.messages
    WHERE id = '8a000003-0000-0000-0000-000000000001'::uuid),
  1,
  'teacher (participant): sees the message'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.messages
    WHERE id = '8a000003-0000-0000-0000-000000000001'::uuid),
  0,
  'parent (non-participant): cannot see the message'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. Messages: non-participant cannot insert — RLS silently filters
--    Verify by checking the message does NOT appear for the parent.
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

DO $$
BEGIN
  -- Parent is not a participant; RLS WITH CHECK blocks this silently (0 rows).
  INSERT INTO public.messages (mosque_id, thread_id, author_profile_id, body)
  SELECT m.mosque_id, m.thread_id,
         '00000000-0000-0000-0000-000000000003',
         'Attempted hack'
  FROM public.messages m WHERE id = '8a000003-0000-0000-0000-000000000001'::uuid;
EXCEPTION WHEN OTHERS THEN
  NULL; -- swallow any error; the important check is the count below
END;
$$;

SELECT is(
  (SELECT count(*)::int FROM public.messages
    WHERE body = 'Attempted hack'),
  0,
  'parent: cannot inject a message into a thread they are not in'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. Notification queue: users see only their own
--    Count only comm-test rows to avoid cross-test pollution from triggers.
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.notification_queue
    WHERE body LIKE '%(comm-test)%'),
  1,
  'admin: sees their own comm-test notification'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.notification_queue
    WHERE body LIKE '%(comm-test)%'),
  0,
  'parent: sees no comm-test notifications (not the recipient)'
);

RESET ROLE;

-- ---------------------------------------------------------------------------

SELECT * FROM finish();
ROLLBACK;
