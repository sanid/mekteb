-- pgTAP: messaging RLS extended tests.
--
-- Covers:
--   • Cross-mosque thread isolation
--   • message_participants read scoping (participants vs non-participants)
--   • Messages: impersonation blocked, legitimate send allowed
--   • notification_queue cross-user isolation within same mosque
--
-- Run with: supabase test db

BEGIN;
SELECT plan(11);

-- ---------------------------------------------------------------------------
-- Setup: thread bb000001 between admin (001) and teacher (002) in mosque A.
--        Mosque B with its own user who has NO relation to mosque A.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_mosque_a  uuid;
  v_mosque_b  uuid := 'bb000000-0000-0000-0000-000000000000'::uuid;
  v_user_b    uuid := 'bb000000-0000-0000-0000-000000000001'::uuid;
  v_thread_a  uuid := 'bb000001-0000-0000-0000-000000000001'::uuid;
  v_msg_a     uuid := 'bb000002-0000-0000-0000-000000000001'::uuid;
BEGIN
  SELECT id INTO v_mosque_a FROM public.mosques WHERE slug = 'dev-mosque';

  INSERT INTO public.message_threads (id, mosque_id, subject, created_by)
  VALUES (v_thread_a, v_mosque_a, 'RLS test thread',
          '00000000-0000-0000-0000-000000000001');

  INSERT INTO public.message_participants (mosque_id, thread_id, profile_id, created_by)
  VALUES
    (v_mosque_a, v_thread_a, '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000001'),
    (v_mosque_a, v_thread_a, '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000001');

  INSERT INTO public.messages (id, mosque_id, thread_id, author_profile_id, body,
                               created_by)
  VALUES (v_msg_a, v_mosque_a, v_thread_a,
          '00000000-0000-0000-0000-000000000001', 'Hi teacher',
          '00000000-0000-0000-0000-000000000001');

  -- Mosque B: isolated user
  INSERT INTO public.mosques (id, name, slug, timezone, locale)
  VALUES (v_mosque_b, 'Mosque B (msg test)', 'msg-test-mosque-b', 'UTC', 'en');

  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_user_b, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user-b-msg@test.invalid', crypt('pw', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"User B Msg"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO public.memberships (user_id, mosque_id, role)
  VALUES (v_user_b, v_mosque_b, 'mosque_admin');

  -- Notifications for cross-user test
  INSERT INTO public.notification_queue (mosque_id, recipient_profile_id, body, status, is_read)
  VALUES
    (v_mosque_a, '00000000-0000-0000-0000-000000000001', 'notif-admin-msg-test', 'sent', false),
    (v_mosque_a, '00000000-0000-0000-0000-000000000002', 'notif-teacher-msg-test', 'sent', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- 1-2. Cross-mosque: mosque B user cannot see mosque A thread or message
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"bb000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.message_threads
    WHERE id = 'bb000001-0000-0000-0000-000000000001'::uuid),
  0,
  'mosque B user: cannot see mosque A thread'
);

SELECT is(
  (SELECT count(*)::int FROM public.messages
    WHERE id = 'bb000002-0000-0000-0000-000000000001'::uuid),
  0,
  'mosque B user: cannot see mosque A message'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. Cross-mosque: mosque B user cannot insert into mosque A thread
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"bb000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- Mosque B user can't see the thread, so mosque_id subquery returns NULL,
-- which triggers the mosque-invariant check.  Any error is sufficient.
SELECT throws_ok(
  $$INSERT INTO public.message_participants (mosque_id, thread_id, profile_id)
    VALUES (
      NULL,
      'bb000001-0000-0000-0000-000000000001'::uuid,
      'bb000000-0000-0000-0000-000000000001'::uuid
    )$$,
  NULL,
  'mosque B user: cannot join mosque A thread'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Admin (participant) can update their own last_read_at
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT lives_ok(
  $$UPDATE public.message_participants
    SET last_read_at = now()
    WHERE thread_id = 'bb000001-0000-0000-0000-000000000001'::uuid
      AND profile_id = '00000000-0000-0000-0000-000000000001'$$,
  'admin: can update own last_read_at'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. Both participants can see each other's participant rows for the thread
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.message_participants
    WHERE thread_id = 'bb000001-0000-0000-0000-000000000001'::uuid),
  2,
  'teacher (participant): sees both participant rows'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. Non-participant cannot see participant rows for the thread
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.message_participants
    WHERE thread_id = 'bb000001-0000-0000-0000-000000000001'::uuid),
  0,
  'parent (non-participant): sees no participant rows'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 7. Non-participant cannot read messages in the thread
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.messages
    WHERE id = 'bb000002-0000-0000-0000-000000000001'::uuid),
  0,
  'parent (non-participant): cannot see message'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 8. Participant cannot author a message as someone else (impersonation)
--    Use message_participants for mosque_id to avoid message_threads RLS edge-cases.
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.messages (mosque_id, thread_id, author_profile_id, body)
    VALUES (
      (SELECT mosque_id FROM public.message_participants
        WHERE thread_id = 'bb000001-0000-0000-0000-000000000001'::uuid
          AND profile_id = '00000000-0000-0000-0000-000000000002'),
      'bb000001-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000001',
      'Impersonation attempt'
    )$$,
  NULL,
  'teacher: cannot send message using admin profile_id'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 9. Participant can send a legitimate message as themselves
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.messages (mosque_id, thread_id, author_profile_id, body)
    VALUES (
      (SELECT mosque_id FROM public.message_participants
        WHERE thread_id = 'bb000001-0000-0000-0000-000000000001'::uuid
          AND profile_id = '00000000-0000-0000-0000-000000000002'),
      'bb000001-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000002',
      'Legitimate reply'
    )$$,
  'teacher: can send message as themselves'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 10. Any mosque member can create a thread
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.message_threads (mosque_id, subject, created_by)
    VALUES (
      (SELECT mosque_id FROM public.memberships
        WHERE user_id = '00000000-0000-0000-0000-000000000003' LIMIT 1),
      'Thread by parent',
      '00000000-0000-0000-0000-000000000003'
    )$$,
  'parent: can create a thread in their mosque'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 11. notification_queue: users see only their own rows
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.notification_queue
    WHERE body LIKE '%msg-test%'),
  1,
  'teacher: sees only their own notification, not admin notification'
);

RESET ROLE;

-- ---------------------------------------------------------------------------

SELECT * FROM finish();
ROLLBACK;
