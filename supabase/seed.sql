-- Local dev seed. Runs automatically after `supabase db reset`.
--
-- Logins:
--   admin@local.test     / Mekteb2026!   — mosque admin
--   teacher@local.test   / Mekteb2026!   — teacher, assigned to Group A
--   parent@local.test    / Mekteb2026!   — parent of Amina
--   examiner@local.test  / Mekteb2026!   — examiner (also a teacher_profile)
--   student@local.test   / Mekteb2026!   — student Yusuf (email login)
--   dev-mosque.amina     / Mekteb2026!   — student Amina (username login, no email)

-- Helper: create an auth.users + auth.identities row for password sign-in.

-- ── Local-only guard ───────────────────────────────────────────────────────
-- These files create fixture accounts with a password committed to a public
-- repo (`Mekteb2026!`) and mock tenant data. `supabase db reset` runs them
-- against the local stack, which is fine — but `supabase db push
-- --include-seed` would apply them to the *linked remote* project, planting
-- known-password admins on a live mosque without wiping anything first, so
-- nothing about the command would look destructive at the time.
--
-- The local stack ships the well-known demo JWT secret; a hosted project has
-- a real one. Anything else — including the setting being absent — is treated
-- as "not local" and aborts, so the guard fails safe.
do $guard$
begin
  if coalesce(current_setting('app.settings.jwt_secret', true), '') not like 'super-secret-jwt-token%' then
    raise exception 'refusing to seed: this is not the local Supabase stack'
      using hint = 'Only `supabase db reset` on the local stack should run these fixtures. If you got here from `supabase db push --include-seed`, drop that flag.';
  end if;
end
$guard$;

create or replace function app._seed_auth_user(
  p_id uuid, p_email text, p_password text, p_full_name text
) returns void
language plpgsql
as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) values (
    p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'display_name', p_full_name),
    now(), now(), '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider, provider_id, identity_data,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id, 'email', p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    now(), now(), now()
  ) on conflict do nothing;
end;
$$;

do $$
declare
  v_mosque_id uuid;
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_teacher_id uuid := '00000000-0000-0000-0000-000000000002';
  v_parent_id uuid := '00000000-0000-0000-0000-000000000003';
  v_examiner_id uuid := '00000000-0000-0000-0000-000000000004';
  v_teacher_profile_id uuid;
  v_examiner_profile_id uuid;
  v_parent_profile_id uuid;
  v_group_id uuid;
  v_group_b_id uuid;
  v_student_amina uuid;
  v_amina_user_id uuid := '00000000-0000-0000-0000-000000000005';
  v_student_yusuf uuid;
  v_yusuf_user_id uuid := '00000000-0000-0000-0000-000000000006';
  v_student_layla uuid;
  v_topic_id uuid;
  v_lesson_id uuid;
  v_req_passed uuid;
  v_req_failed uuid;
  v_req_in_progress uuid;
  v_req_confirmed uuid;
  v_req_proposed uuid;
begin
  insert into public.mosques (id, name, slug, timezone, locale)
  values ('5bbdf6e3-f020-40e5-bce7-cddce8e20af2', 'Mekteb Dev Mosque', 'dev-mosque', 'UTC', 'de')
  on conflict (id) do update set name = excluded.name
  returning id into v_mosque_id;

  -- Auth users (admin, teacher, parent)
  perform app._seed_auth_user(v_admin_id,   'admin@local.test',   'Mekteb2026!', 'Dev Admin');
  perform app._seed_auth_user(v_teacher_id, 'teacher@local.test', 'Mekteb2026!', 'Dev Teacher');
  perform app._seed_auth_user(v_parent_id,  'parent@local.test',  'Mekteb2026!', 'Dev Parent');
  perform app._seed_auth_user(v_examiner_id,'examiner@local.test','Mekteb2026!', 'Dev Examiner');

  -- A student login. Students have no email: they sign in with a
  -- mosque-qualified username (`dev-mosque.amina`), and the address below is
  -- only the internal auth identity that `buildStudentEmail` derives.
  -- Without this, none of the student-only screens can be reached locally.
  perform app._seed_auth_user(
    v_amina_user_id, 'amina@students.dev-mosque.mekteb.de', 'Mekteb2026!', 'Amina Demirović'
  );

  -- A student with a plain email login, for quick testing of the student
  -- portal without remembering the username format.
  perform app._seed_auth_user(v_yusuf_user_id, 'student@local.test', 'Mekteb2026!', 'Yusuf Hadžić');

  -- Memberships
  insert into public.memberships (user_id, mosque_id, role) values
    (v_admin_id,    v_mosque_id, 'mosque_admin'),
    (v_teacher_id,  v_mosque_id, 'teacher'),
    (v_teacher_id,  v_mosque_id, 'examiner'),   -- dual role to test portal switcher
    (v_parent_id,   v_mosque_id, 'parent'),
    (v_examiner_id, v_mosque_id, 'examiner'),
    (v_examiner_id, v_mosque_id, 'teacher')     -- dual role; examiner also assigned a group below
  on conflict do nothing;

  -- Teacher + parent domain profiles
  insert into public.teacher_profiles (mosque_id, profile_id, bio)
  values (v_mosque_id, v_teacher_id, 'Seeded dev teacher')
  returning id into v_teacher_profile_id;

  -- Examiners are stored as teacher_profiles (with an extra examiner membership)
  insert into public.teacher_profiles (mosque_id, profile_id, bio)
  values (v_mosque_id, v_examiner_id, 'Seeded dev examiner')
  returning id into v_examiner_profile_id;

  insert into public.parent_profiles (mosque_id, profile_id, relation)
  values (v_mosque_id, v_parent_id, 'parent')
  returning id into v_parent_profile_id;

  -- Group + teacher assignment
  insert into public.groups (mosque_id, name, description)
  values (v_mosque_id, 'Group A', 'Starter group seeded for local dev')
  returning id into v_group_id;

  insert into public.groups (mosque_id, name, description)
  values (v_mosque_id, 'Group B (Advanced)', 'Next-level group for promoted students')
  returning id into v_group_b_id;

  insert into public.teacher_group_links (mosque_id, teacher_profile_id, group_id)
  values (v_mosque_id, v_teacher_profile_id, v_group_id);

  -- Students
  insert into public.student_profiles (mosque_id, full_name)
  values (v_mosque_id, 'Amina Demirović') returning id into v_student_amina;
  update public.student_profiles
     set username = 'amina', profile_id = v_amina_user_id
   where id = v_student_amina;
  insert into public.student_profiles (mosque_id, full_name)
  values (v_mosque_id, 'Yusuf Hadžić')   returning id into v_student_yusuf;
  update public.student_profiles
     set username = 'yusuf', profile_id = v_yusuf_user_id
   where id = v_student_yusuf;
  insert into public.student_profiles (mosque_id, full_name)
  values (v_mosque_id, 'Layla Begić')    returning id into v_student_layla;

  -- Enroll all three into Group A
  insert into public.group_enrollments (mosque_id, group_id, student_profile_id) values
    (v_mosque_id, v_group_id, v_student_amina),
    (v_mosque_id, v_group_id, v_student_yusuf),
    (v_mosque_id, v_group_id, v_student_layla);

  -- Parent linked to Amina
  insert into public.parent_student_links (mosque_id, parent_profile_id, student_profile_id, is_primary)
  values (v_mosque_id, v_parent_profile_id, v_student_amina, true);

  -- Memorisation progress, so the hifz card in the app and the hifz row on the
  -- home-screen widget both have something to show.
  -- Group B, not Group A: she is promoted into it further down, and progress
  -- attached to the group she left would not match her active enrolment.
  insert into public.hifz_progress
    (mosque_id, student_profile_id, group_id, pages_memorized, notes, created_by, updated_by)
  values
    (v_mosque_id, v_student_amina, v_group_b_id, 124, 'Juz 1-6 gefestigt',
     v_teacher_id, v_teacher_id);

  -- Starter content: one topic + one lesson
  insert into public.topics (mosque_id, title, description, sort_order)
  values (v_mosque_id, 'Tajweed basics', 'Introductory tajweed rules', 1)
  returning id into v_topic_id;

  insert into public.lessons (mosque_id, topic_id, title, body, sort_order)
  values (v_mosque_id, v_topic_id, 'Lesson 1: letters of izhar', '[{"id":"seed1","type":"paragraph","props":{"textColor":"default","backgroundColor":"default","textAlignment":"left"},"content":[{"type":"text","text":"Letters and articulation.","styles":{}}],"children":[]}]'::jsonb, 1)
  returning id into v_lesson_id;

  -- ── Exam seeds ──────────────────────────────────────────────────────────
  -- Five scenarios across the three students so every state is testable:
  --   1. PASSED + promoted to Group B (diploma ready)   — Amina
  --   2. FAILED with examiner notes                     — Yusuf
  --   3. IN_PROGRESS (examiner is conducting)           — Layla
  --   4. SCHEDULED (date confirmed by parent)           — Amina
  --   5. PROPOSED  (examiner suggested, awaiting reply) — Yusuf
  --   + 1 PENDING request (teacher nominated, no session yet) — Layla

  -- 1. Passed (Amina) — completed exam, diploma not yet generated.
  insert into public.exam_requests
    (mosque_id, student_profile_id, group_id, requested_by, status, notes, created_by, updated_by)
  values
    (v_mosque_id, v_student_amina, v_group_id, v_teacher_profile_id,
     'completed', 'Strong recitation; ready for advanced group.',
     v_teacher_id, v_teacher_id)
  returning id into v_req_passed;

  insert into public.exam_sessions
    (mosque_id, exam_request_id, student_profile_id, examiner_profile_id,
     from_group_id, to_group_id, status, schedule_status, summary,
     exam_date, proposed_date, proposed_by,
     oral_required, oral_passed, written_required, written_passed,
     created_by, updated_by)
  values
    (v_mosque_id, v_req_passed, v_student_amina, v_examiner_profile_id,
     v_group_id, v_group_b_id, 'passed', 'confirmed',
     'Excellent tajweed and clear articulation. Recommended for promotion.',
     current_date - 7, current_date - 7, 'examiner',
     true, true, true, true,
     v_examiner_id, v_examiner_id);

  -- Promotion already applied for the passed case
  update public.group_enrollments
     set is_active = false, ended_at = current_date - 7, updated_by = v_examiner_id
   where student_profile_id = v_student_amina
     and group_id = v_group_id
     and is_active;
  insert into public.group_enrollments (mosque_id, group_id, student_profile_id, enrolled_at, created_by, updated_by)
  values (v_mosque_id, v_group_b_id, v_student_amina, current_date - 7, v_examiner_id, v_examiner_id);

  -- 2. Failed (Yusuf) — group teacher can read the notes.
  insert into public.exam_requests
    (mosque_id, student_profile_id, group_id, requested_by, status, notes, created_by, updated_by)
  values
    (v_mosque_id, v_student_yusuf, v_group_id, v_teacher_profile_id,
     'completed', 'Needs more practice on long vowels.',
     v_teacher_id, v_teacher_id)
  returning id into v_req_failed;

  insert into public.exam_sessions
    (mosque_id, exam_request_id, student_profile_id, examiner_profile_id,
     from_group_id, status, schedule_status, summary,
     exam_date, proposed_date, proposed_by,
     oral_required, oral_passed, written_required, written_passed,
     created_by, updated_by)
  values
    (v_mosque_id, v_req_failed, v_student_yusuf, v_examiner_profile_id,
     v_group_id, 'failed', 'confirmed',
     'Oral part solid, but written portion below threshold. Retake recommended in 4 weeks.',
     current_date - 3, current_date - 3, 'examiner',
     true, true, true, false,
     v_examiner_id, v_examiner_id);

  -- 3. In progress (Layla) — examiner has started but not completed.
  insert into public.exam_requests
    (mosque_id, student_profile_id, group_id, requested_by, status, notes, created_by, updated_by)
  values
    (v_mosque_id, v_student_layla, v_group_id, v_teacher_profile_id,
     'accepted', 'Ready for written-only assessment.',
     v_teacher_id, v_teacher_id)
  returning id into v_req_in_progress;

  insert into public.exam_sessions
    (mosque_id, exam_request_id, student_profile_id, examiner_profile_id,
     from_group_id, status, schedule_status,
     exam_date, proposed_date, proposed_by,
     oral_required, written_required,
     created_by, updated_by)
  values
    (v_mosque_id, v_req_in_progress, v_student_layla, v_examiner_profile_id,
     v_group_id, 'in_progress', 'confirmed',
     current_date, current_date, 'examiner',
     false, true,
     v_examiner_id, v_examiner_id);

  -- 4. Scheduled & confirmed (Amina, future date) — shows up as upcoming.
  insert into public.exam_requests
    (mosque_id, student_profile_id, group_id, requested_by, status, notes, created_by, updated_by)
  values
    (v_mosque_id, v_student_amina, v_group_b_id, v_teacher_profile_id,
     'accepted', 'Follow-up proficiency check.',
     v_teacher_id, v_teacher_id)
  returning id into v_req_confirmed;

  insert into public.exam_sessions
    (mosque_id, exam_request_id, student_profile_id, examiner_profile_id,
     from_group_id, status, schedule_status,
     exam_date, proposed_date, proposed_by,
     oral_required, written_required,
     created_by, updated_by)
  values
    (v_mosque_id, v_req_confirmed, v_student_amina, v_examiner_profile_id,
     v_group_b_id, 'scheduled', 'confirmed',
     current_date + 5, current_date + 5, 'examiner',
     true, true,
     v_examiner_id, v_examiner_id);

  -- 5. Proposed (Yusuf) — examiner suggested a date, parent/student to respond.
  insert into public.exam_requests
    (mosque_id, student_profile_id, group_id, requested_by, status, notes, created_by, updated_by)
  values
    (v_mosque_id, v_student_yusuf, v_group_id, v_teacher_profile_id,
     'accepted', 'Retake after additional practice.',
     v_teacher_id, v_teacher_id)
  returning id into v_req_proposed;

  insert into public.exam_sessions
    (mosque_id, exam_request_id, student_profile_id, examiner_profile_id,
     from_group_id, status, schedule_status,
     exam_date, proposed_date, proposed_by,
     oral_required, written_required,
     created_by, updated_by)
  values
    (v_mosque_id, v_req_proposed, v_student_yusuf, v_examiner_profile_id,
     v_group_id, 'proposed', 'proposed',
     current_date + 10, current_date + 10, 'examiner',
     true, true,
     v_examiner_id, v_examiner_id);

  -- 6. Pending (Layla) — fresh teacher nomination, no session yet.
  insert into public.exam_requests
    (mosque_id, student_profile_id, group_id, requested_by, status, notes, created_by, updated_by)
  values
    (v_mosque_id, v_student_layla, v_group_id, v_teacher_profile_id,
     'pending', 'Please assess for promotion when possible.',
     v_teacher_id, v_teacher_id);

  -- Seed group categories
  insert into public.group_categories (id, mosque_id, name, color) values
    ('11111111-1111-1111-1111-111111111111', v_mosque_id, 'Hifz', '#10b981'),
    ('22222222-2222-2222-2222-222222222222', v_mosque_id, 'Tajweed', '#3b82f6'),
    ('33333333-3333-3333-3333-333333333333', v_mosque_id, 'Mekteb', '#8b5cf6')
  on conflict (id) do nothing;
end $$;

drop function app._seed_auth_user(uuid, text, text, text);

-- Question bank: 5 topics, 100 questions extracted from the ilmihal curriculum.
do $$
declare
  v_mosque_id uuid := '5bbdf6e3-f020-40e5-bce7-cddce8e20af2';
  v_t1 uuid; -- Glaubenslehre (Iman)
  v_t2 uuid; -- Unser Prophet ﷺ
  v_t3 uuid; -- Gebet und Reinigung
  v_t4 uuid; -- Säulen des Islam
  v_t5 uuid; -- Heilige Nächte
begin
  insert into public.topics (mosque_id, title, description, sort_order) values
    (v_mosque_id, 'Glaubenslehre (Iman)',    'Die sechs Grundsätze des Iman und Grundlagen des Glaubens', 2)
  returning id into v_t1;
  insert into public.topics (mosque_id, title, description, sort_order) values
    (v_mosque_id, 'Unser Prophet ﷺ',          'Das Leben und die Familie des Propheten Muhammed ﷺ',        3)
  returning id into v_t2;
  insert into public.topics (mosque_id, title, description, sort_order) values
    (v_mosque_id, 'Gebet und Reinigung',     'Namaz, Abdest, Ghusl, Teyemmüm und Reinigungsvorschriften',  4)
  returning id into v_t3;
  insert into public.topics (mosque_id, title, description, sort_order) values
    (v_mosque_id, 'Säulen des Islam',        'Die fünf Säulen: Schehādet, Namaz, Zekāt, Fasten, Hadsch',   5)
  returning id into v_t4;
  insert into public.topics (mosque_id, title, description, sort_order) values
    (v_mosque_id, 'Heilige Nächte',          'Kandil-Nächte und ihre Bedeutung im Islam',                   6)
  returning id into v_t5;

  -- ── Glaubenslehre (Iman) — 20 questions ─────────────────────────────────
  insert into public.exam_questions (mosque_id, topic_id, question_text, difficulty) values
    (v_mosque_id, v_t1, 'Was bedeutet es, Muslim zu sein?', 'easy'),
    (v_mosque_id, v_t1, 'Wer hat dich erschaffen?', 'easy'),
    (v_mosque_id, v_t1, 'Was antwortest du auf die Frage, wie viele Götter es gibt?', 'easy'),
    (v_mosque_id, v_t1, 'Was ist für dich der Beweis für die Einzigkeit Allahs?', 'medium'),
    (v_mosque_id, v_t1, 'Ist es erlaubt, über das Wesen Allahs nachzudenken? Begründe deine Antwort.', 'medium'),
    (v_mosque_id, v_t1, 'Was ist Īmān-i Yeis und warum nimmt Allah diesen Glauben nicht an?', 'medium'),
    (v_mosque_id, v_t1, 'Was sind die sechs Grundsätze des Iman?', 'easy'),
    (v_mosque_id, v_t1, 'Was sind Engel und woraus wurden sie erschaffen?', 'easy'),
    (v_mosque_id, v_t1, 'Wer sind die vier großen Engel und welche Aufgaben haben sie?', 'medium'),
    (v_mosque_id, v_t1, 'Welches sind die vier großen Offenbarungsschriften und welchen Propheten wurden sie offenbart?', 'medium'),
    (v_mosque_id, v_t1, 'Was sind die Suhuf, wie viele sind es und wem wurden sie offenbart?', 'hard'),
    (v_mosque_id, v_t1, 'Was ist eine Mezheb (Rechtsschule)?', 'medium'),
    (v_mosque_id, v_t1, 'Wie viele Rechtsschulen der Praxis gibt es in der Ehl-i Sünnet und wie heißen sie?', 'medium'),
    (v_mosque_id, v_t1, 'Was ist der Glaube an den Āchira-Tag?', 'easy'),
    (v_mosque_id, v_t1, 'Was bedeutet der Glaube an Qader (Vorherbestimmung)?', 'medium'),
    (v_mosque_id, v_t1, 'Was ist der Unterschied zwischen einem Propheten (Nabi) und einem Gesandten (Rasul)?', 'hard'),
    (v_mosque_id, v_t1, 'Was ist Tewbe-i Yeis und nimmt Allah diese Tewbe an?', 'medium'),
    (v_mosque_id, v_t1, 'Was bedeutet Tawhid (Einzigkeit Allahs)?', 'easy'),
    (v_mosque_id, v_t1, 'Welches sind die Eigenschaften Allahs, die jeder Muslim kennen muss?', 'hard'),
    (v_mosque_id, v_t1, 'Was ist der Unterschied zwischen Islam, Iman und Ihsan?', 'hard');

  -- ── Unser Prophet ﷺ — 20 questions ─────────────────────────────────────
  insert into public.exam_questions (mosque_id, topic_id, question_text, difficulty) values
    (v_mosque_id, v_t2, 'Wo wurde Rasūlullah ﷺ geboren und wo befindet er sich heute?', 'easy'),
    (v_mosque_id, v_t2, 'Wie lautet der am häufigsten verwendete Name unseres Propheten ﷺ?', 'easy'),
    (v_mosque_id, v_t2, 'Wie hieß der Vater von Rasūlullah ﷺ?', 'easy'),
    (v_mosque_id, v_t2, 'Wie hieß die Mutter von Rasūlullah ﷺ?', 'easy'),
    (v_mosque_id, v_t2, 'Wie hieß der Großvater von Rasūlullah ﷺ?', 'easy'),
    (v_mosque_id, v_t2, 'In welchem Alter wurde unser Prophet ﷺ zum Propheten ernannt?', 'easy'),
    (v_mosque_id, v_t2, 'Wie lange wirkte Rasūlullah ﷺ als Prophet?', 'easy'),
    (v_mosque_id, v_t2, 'In welchem Alter starb Rasūlullah ﷺ?', 'easy'),
    (v_mosque_id, v_t2, 'Wie viele Töchter hatte Rasūlullah ﷺ und wie hießen sie?', 'medium'),
    (v_mosque_id, v_t2, 'Wie viele Söhne hatte Rasūlullah ﷺ und wie hießen sie?', 'medium'),
    (v_mosque_id, v_t2, 'Welche sind die vorzüglichsten Enkel unseres Propheten ﷺ?', 'medium'),
    (v_mosque_id, v_t2, 'Wen bezeichnet man als Propheten?', 'easy'),
    (v_mosque_id, v_t2, 'Wie viele Propheten werden im Qur''ān-i Kerīm namentlich genannt?', 'medium'),
    (v_mosque_id, v_t2, 'Wann ist Hazret-i Muhammed Mustafa ﷺ geboren und wann ist er gestorben?', 'medium'),
    (v_mosque_id, v_t2, 'Wann machte Rasūlullah ﷺ die Hidschra nach Medīna und was ist die Hidschra?', 'medium'),
    (v_mosque_id, v_t2, 'Welche ist die erste Ehefrau Rasūlullahs ﷺ und was zeichnete sie aus?', 'medium'),
    (v_mosque_id, v_t2, 'Wie viele schöne Namen hatte Rasūlullah ﷺ? Nenne vier davon.', 'medium'),
    (v_mosque_id, v_t2, 'Wie viele Propheten sandte Allah laut Überlieferung zu den Menschen?', 'hard'),
    (v_mosque_id, v_t2, 'Woher stammt Imam Ebū Mansūr Muhammed Mātürīdī und wann ist er gestorben?', 'hard'),
    (v_mosque_id, v_t2, 'Nenne die wichtigsten Gründe, warum Rasūlullah ﷺ nach seinem 53. Lebensjahr geheiratet hat.', 'hard');

  -- ── Gebet und Reinigung — 20 questions ──────────────────────────────────
  insert into public.exam_questions (mosque_id, topic_id, question_text, difficulty) values
    (v_mosque_id, v_t3, 'Wie viele Farz-Handlungen hat die rituelle Waschung (Abdest) und welche sind es?', 'medium'),
    (v_mosque_id, v_t3, 'Wann wird die rituelle Waschung ungültig? Nenne mindestens fünf Gründe.', 'medium'),
    (v_mosque_id, v_t3, 'Wie viele Farz-Handlungen hat die Ghusl und welche sind es?', 'medium'),
    (v_mosque_id, v_t3, 'Wie wird die Ghusl (rituelle Ganzkörperwaschung) durchgeführt?', 'hard'),
    (v_mosque_id, v_t3, 'Wie viele Farz-Handlungen hat der Teyemmüm und wie wird er durchgeführt?', 'medium'),
    (v_mosque_id, v_t3, 'Wie viele Farz-Handlungen hat das Namaz insgesamt?', 'easy'),
    (v_mosque_id, v_t3, 'Was sind die sechs Voraussetzungen vor dem Namaz?', 'medium'),
    (v_mosque_id, v_t3, 'Was sind die sechs Farz-Handlungen während des Namaz?', 'medium'),
    (v_mosque_id, v_t3, 'Wie oft ist täglich Namaz zu verrichten und wie heißen die fünf Gebete?', 'easy'),
    (v_mosque_id, v_t3, 'Wie viele Rek''ats hat das Morgengebet (Fajr/Fedschr) und wie sind sie aufgeteilt?', 'medium'),
    (v_mosque_id, v_t3, 'Wie viele Rek''ats hat das Nachtgebet (Ischa/''Ischā) und wie sind sie aufgeteilt?', 'hard'),
    (v_mosque_id, v_t3, 'Was ist die Sehw-Sedschde und wann ist sie erforderlich?', 'medium'),
    (v_mosque_id, v_t3, 'Wie wird die Sehw-Sedschde durchgeführt?', 'hard'),
    (v_mosque_id, v_t3, 'Nenne drei Fälle, die eine Sehw-Sedschde erfordern.', 'hard'),
    (v_mosque_id, v_t3, 'Was sind die Sunna-Handlungen bei der rituellen Waschung? Nenne mindestens fünf.', 'hard'),
    (v_mosque_id, v_t3, 'Was sind Mekruh-Handlungen bei der rituellen Waschung?', 'medium'),
    (v_mosque_id, v_t3, 'Was bedeutet Niyet (Absicht) im Namaz und muss sie ausgesprochen werden?', 'easy'),
    (v_mosque_id, v_t3, 'Was ist Qibla und warum ist sie für das Namaz wichtig?', 'easy'),
    (v_mosque_id, v_t3, 'Was ist der Unterschied zwischen einem Farz und einem Wādschib im Namaz?', 'hard'),
    (v_mosque_id, v_t3, 'Welche drei gerechtfertigten Gründe gibt es dafür, dass ein Namaz nachgeholt werden muss?', 'medium');

  -- ── Säulen des Islam — 20 questions ─────────────────────────────────────
  insert into public.exam_questions (mosque_id, topic_id, question_text, difficulty) values
    (v_mosque_id, v_t4, 'Wie viele Säulen hat der Islam und welche sind es?', 'easy'),
    (v_mosque_id, v_t4, 'Was ist die Kelime-i Schehādet und was bedeutet sie?', 'easy'),
    (v_mosque_id, v_t4, 'Kannst du die 32 Pflichten (Farz) aufzählen?', 'hard'),
    (v_mosque_id, v_t4, 'Was ist Zekāt und wann ist sie Pflicht?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist Sadaqa-i Fitr (Fitrabgabe) und wann wird sie entrichtet?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist das Freitagsgebet (Dschumua/Cuma) und für wen ist es Pflicht?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist das Festgebet (Eid-Namaz) und wie unterscheidet es sich vom normalen Namaz?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist Tarāwih-Namaz und wann wird er verrichtet?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist Itiqaf und wann wird er praktiziert?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist Fasten (Sawm) und welche Bedingungen muss man dabei einhalten?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist Hadsch und ab wann ist er Pflicht?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist Qurban (Opfer) und wann wird es vollzogen?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist Aqīqa-Qurban und bei welchem Anlass wird es dargebracht?', 'hard'),
    (v_mosque_id, v_t4, 'Was ist Uschr und wie unterscheidet er sich von der Zekāt?', 'hard'),
    (v_mosque_id, v_t4, 'Was sind die Farz-Handlungen des Fastens?', 'medium'),
    (v_mosque_id, v_t4, 'Was sind die Aufgaben der Muslime in der Gemeinschaft?', 'medium'),
    (v_mosque_id, v_t4, 'Was ist das Bestattungsgebet (Cenaze Namaz) und wie wird es verrichtet?', 'hard'),
    (v_mosque_id, v_t4, 'Was sind Tewbe und Istighfār und welche Bedeutung haben sie?', 'medium'),
    (v_mosque_id, v_t4, 'Was sind die größten Sünden (Kebāir) im Islam?', 'hard'),
    (v_mosque_id, v_t4, 'Was ist Nefs-i Emmāre und wie soll ein Muslim dagegen ankämpfen?', 'hard');

  -- ── Heilige Nächte — 20 questions ────────────────────────────────────────
  insert into public.exam_questions (mosque_id, topic_id, question_text, difficulty) values
    (v_mosque_id, v_t5, 'Wie nennen wir die segensreichen Nächte im Islam?', 'easy'),
    (v_mosque_id, v_t5, 'Wie viele Kandil-Nächte gibt es und wie heißen sie?', 'easy'),
    (v_mosque_id, v_t5, 'Was ist die Mewlid-Nacht?', 'easy'),
    (v_mosque_id, v_t5, 'Was ist die Regaib-Nacht?', 'medium'),
    (v_mosque_id, v_t5, 'Was ist die Mi''radsch-Nacht und welches Ereignis wird dabei gedacht?', 'medium'),
    (v_mosque_id, v_t5, 'Was ist die Berāet-Nacht und welche Ereignisse finden in dieser Nacht statt?', 'medium'),
    (v_mosque_id, v_t5, 'Was ist die Qadr-Nacht und warum ist sie besonders bedeutsam?', 'medium'),
    (v_mosque_id, v_t5, 'Was ist die Isrā-wal-Mi''rādsch und welche Bedeutung hat dieses Ereignis für Muslime?', 'hard'),
    (v_mosque_id, v_t5, 'Was ist die Lewh-i Mahfuz?', 'hard'),
    (v_mosque_id, v_t5, 'Seit wann bist du Muslim laut islamischem Glauben?', 'medium'),
    (v_mosque_id, v_t5, 'Was ist der Mīsāq (Urvertrag) zwischen Allah und den Seelen?', 'hard'),
    (v_mosque_id, v_t5, 'Was ist dein Dīn, deine Schrift und deine Qibla?', 'easy'),
    (v_mosque_id, v_t5, 'Zu wessen Umma gehörst du als Muslim?', 'easy'),
    (v_mosque_id, v_t5, 'Was ist der Rawza-i Mutahhara und wo befindet er sich?', 'medium'),
    (v_mosque_id, v_t5, 'Was sind die Edille-i Scheriyye (islamische Rechtsquellen)?', 'hard'),
    (v_mosque_id, v_t5, 'Was bedeutet Erkenntnisgewinn (Ilm) im Islam und welche Arten gibt es?', 'hard'),
    (v_mosque_id, v_t5, 'Was ist die Sure Ichlās und warum ist sie wichtig?', 'easy'),
    (v_mosque_id, v_t5, 'Was ist die Bedeutung von Elestü birabbiküm und Belā?', 'medium'),
    (v_mosque_id, v_t5, 'Was sind die Ashāb-i Kirām (ehrenwerte Gefährten des Propheten)?', 'medium'),
    (v_mosque_id, v_t5, 'Was ist der Unterschied zwischen den Kelime-i Tewhid und der Kelime-i Schehādet?', 'hard');
end $$;

-- BEGIN German School Holidays Seed --

-- German School Holidays Seed (Years 2026-2029)
-- Generated automatically from deutsche-schulferien-api.vercel.app

insert into public.school_holidays (state, name, start_date, end_date)
values
  ('Baden-Württemberg', 'Osterferien 2026', '2026-03-30', '2026-04-11'),
  ('Baden-Württemberg', 'Pfingstferien 2026', '2026-05-26', '2026-06-05'),
  ('Baden-Württemberg', 'Sommerferien 2026', '2026-07-30', '2026-09-12'),
  ('Baden-Württemberg', 'Herbstferien 2026', '2026-10-26', '2026-10-30'),
  ('Baden-Württemberg', 'Herbstferien 2026', '2026-10-31', '2026-10-31'),
  ('Baden-Württemberg', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-09'),
  ('Bayern', 'Winterferien 2026', '2026-02-16', '2026-02-20'),
  ('Bayern', 'Osterferien 2026', '2026-03-30', '2026-04-10'),
  ('Bayern', 'Pfingstferien 2026', '2026-05-26', '2026-06-05'),
  ('Bayern', 'Sommerferien 2026', '2026-08-03', '2026-09-14'),
  ('Bayern', 'Herbstferien 2026', '2026-11-02', '2026-11-06'),
  ('Bayern', 'Herbstferien 2026', '2026-11-18', '2026-11-18'),
  ('Bayern', 'Weihnachtsferien 2026', '2026-12-24', '2027-01-08'),
  ('Berlin', 'Winterferien 2026', '2026-02-02', '2026-02-07'),
  ('Berlin', 'Osterferien 2026', '2026-03-30', '2026-04-10'),
  ('Berlin', 'Variabler Ferientag 2026', '2026-05-15', '2026-05-15'),
  ('Berlin', 'Pfingstferien 2026', '2026-05-26', '2026-05-26'),
  ('Berlin', 'Sommerferien 2026', '2026-07-16', '2026-08-28'),
  ('Berlin', 'Herbstferien 2026', '2026-10-19', '2026-10-31'),
  ('Berlin', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-02'),
  ('Brandenburg', 'Winterferien 2026', '2026-02-02', '2026-02-07'),
  ('Brandenburg', 'Osterferien 2026', '2026-03-30', '2026-04-10'),
  ('Brandenburg', 'Variabler Ferientag 2026', '2026-05-15', '2026-05-15'),
  ('Brandenburg', 'Pfingstferien 2026', '2026-05-26', '2026-05-26'),
  ('Brandenburg', 'Sommerferien 2026', '2026-07-09', '2026-08-22'),
  ('Brandenburg', 'Herbstferien 2026', '2026-10-19', '2026-10-30'),
  ('Brandenburg', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-02'),
  ('Bremen', 'Winterferien 2026', '2026-02-02', '2026-02-03'),
  ('Bremen', 'Osterferien 2026', '2026-03-23', '2026-04-07'),
  ('Bremen', 'Pfingstferien 2026', '2026-05-15', '2026-05-15'),
  ('Bremen', 'Pfingstferien 2026', '2026-05-26', '2026-05-26'),
  ('Bremen', 'Sommerferien 2026', '2026-07-02', '2026-08-12'),
  ('Bremen', 'Herbstferien 2026', '2026-10-12', '2026-10-24'),
  ('Bremen', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-09'),
  ('Hamburg', 'Winterferien 2026', '2026-01-30', '2026-01-30'),
  ('Hamburg', 'Osterferien 2026', '2026-03-02', '2026-03-13'),
  ('Hamburg', 'Pfingstferien 2026', '2026-05-11', '2026-05-15'),
  ('Hamburg', 'Sommerferien 2026', '2026-07-09', '2026-08-19'),
  ('Hamburg', 'Herbstferien 2026', '2026-10-19', '2026-10-30'),
  ('Hamburg', 'Weihnachtsferien 2026', '2026-12-21', '2027-01-01'),
  ('Hessen', 'Osterferien 2026', '2026-03-30', '2026-04-10'),
  ('Hessen', 'Sommerferien 2026', '2026-06-29', '2026-08-07'),
  ('Hessen', 'Herbstferien 2026', '2026-10-05', '2026-10-17'),
  ('Hessen', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-12'),
  ('Mecklenburg-Vorpommern', 'Winterferien 2026', '2026-02-09', '2026-02-20'),
  ('Mecklenburg-Vorpommern', 'Osterferien 2026', '2026-03-30', '2026-04-08'),
  ('Mecklenburg-Vorpommern', 'Pfingstferien 2026', '2026-05-15', '2026-05-15'),
  ('Mecklenburg-Vorpommern', 'Pfingstferien 2026', '2026-05-22', '2026-05-26'),
  ('Mecklenburg-Vorpommern', 'Sommerferien 2026', '2026-07-13', '2026-08-22'),
  ('Mecklenburg-Vorpommern', 'Herbstferien 2026', '2026-10-19', '2026-10-24'),
  ('Mecklenburg-Vorpommern', 'Herbstferien 2026', '2026-11-26', '2026-11-27'),
  ('Mecklenburg-Vorpommern', 'Weihnachtsferien 2026', '2026-12-19', '2027-01-02'),
  ('Niedersachsen', 'Winterferien 2026', '2026-02-02', '2026-02-03'),
  ('Niedersachsen', 'Osterferien 2026', '2026-03-23', '2026-04-07'),
  ('Niedersachsen', 'Pfingstferien 2026', '2026-05-15', '2026-05-15'),
  ('Niedersachsen', 'Pfingstferien 2026', '2026-05-26', '2026-05-26'),
  ('Niedersachsen', 'Sommerferien 2026', '2026-07-02', '2026-08-12'),
  ('Niedersachsen', 'Herbstferien 2026', '2026-10-12', '2026-10-24'),
  ('Niedersachsen', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-09'),
  ('Nordrhein-Westfalen', 'Osterferien 2026', '2026-03-30', '2026-04-11'),
  ('Nordrhein-Westfalen', 'Pfingstferien 2026', '2026-05-26', '2026-05-26'),
  ('Nordrhein-Westfalen', 'Sommerferien 2026', '2026-07-20', '2026-09-01'),
  ('Nordrhein-Westfalen', 'Herbstferien 2026', '2026-10-17', '2026-10-31'),
  ('Nordrhein-Westfalen', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-06'),
  ('Rheinland-Pfalz', 'Osterferien 2026', '2026-03-30', '2026-04-10'),
  ('Rheinland-Pfalz', 'Sommerferien 2026', '2026-06-29', '2026-08-07'),
  ('Rheinland-Pfalz', 'Herbstferien 2026', '2026-10-05', '2026-10-16'),
  ('Rheinland-Pfalz', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-08'),
  ('Saarland', 'Winterferien 2026', '2026-02-16', '2026-02-20'),
  ('Saarland', 'Osterferien 2026', '2026-04-07', '2026-04-17'),
  ('Saarland', 'Sommerferien 2026', '2026-06-29', '2026-08-07'),
  ('Saarland', 'Herbstferien 2026', '2026-10-05', '2026-10-16'),
  ('Saarland', 'Weihnachtsferien 2026', '2026-12-21', '2026-12-31'),
  ('Sachsen-Anhalt', 'Winterferien 2026', '2026-01-31', '2026-02-06'),
  ('Sachsen-Anhalt', 'Osterferien 2026', '2026-03-30', '2026-04-04'),
  ('Sachsen-Anhalt', 'Pfingstferien 2026', '2026-05-26', '2026-05-29'),
  ('Sachsen-Anhalt', 'Sommerferien 2026', '2026-07-04', '2026-08-14'),
  ('Sachsen-Anhalt', 'Herbstferien 2026', '2026-10-19', '2026-10-30'),
  ('Sachsen-Anhalt', 'Weihnachtsferien 2026', '2026-12-21', '2027-01-02'),
  ('Sachsen', 'Winterferien 2026', '2026-02-09', '2026-02-21'),
  ('Sachsen', 'Osterferien 2026', '2026-04-03', '2026-04-10'),
  ('Sachsen', 'Osterferien 2026', '2026-05-15', '2026-05-15'),
  ('Sachsen', 'Sommerferien 2026', '2026-07-04', '2026-08-14'),
  ('Sachsen', 'Herbstferien 2026', '2026-10-12', '2026-10-24'),
  ('Sachsen', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-02'),
  ('Schleswig-Holstein', 'Winterferien 2026', '2026-02-02', '2026-02-03'),
  ('Schleswig-Holstein', 'Osterferien 2026', '2026-03-26', '2026-04-10'),
  ('Schleswig-Holstein', 'Pfingstferien 2026', '2026-05-15', '2026-05-15'),
  ('Schleswig-Holstein', 'Sommerferien 2026', '2026-07-04', '2026-08-15'),
  ('Schleswig-Holstein', 'Herbstferien 2026', '2026-10-12', '2026-10-24'),
  ('Schleswig-Holstein', 'Weihnachtsferien 2026', '2026-12-21', '2027-01-06'),
  ('Thüringen', 'Winterferien 2026', '2026-02-16', '2026-02-21'),
  ('Thüringen', 'Osterferien 2026', '2026-04-07', '2026-04-17'),
  ('Thüringen', 'Pfingstferien 2026', '2026-05-15', '2026-05-15'),
  ('Thüringen', 'Sommerferien 2026', '2026-07-04', '2026-08-14'),
  ('Thüringen', 'Herbstferien 2026', '2026-10-12', '2026-10-24'),
  ('Thüringen', 'Weihnachtsferien 2026', '2026-12-23', '2027-01-02'),
  ('Baden-Württemberg', 'Osterferien 2027', '2027-03-25', '2027-04-03'),
  ('Baden-Württemberg', 'Pfingstferien 2027', '2027-05-18', '2027-05-29'),
  ('Baden-Württemberg', 'Sommerferien 2027', '2027-07-29', '2027-09-11'),
  ('Baden-Württemberg', 'Herbstferien 2027', '2027-11-02', '2027-11-06'),
  ('Baden-Württemberg', 'Weihnachtsferien 2027', '2027-12-23', '2028-01-08'),
  ('Bayern', 'Winterferien 2027', '2027-02-08', '2027-02-12'),
  ('Bayern', 'Osterferien 2027', '2027-03-22', '2027-04-02'),
  ('Bayern', 'Pfingstferien 2027', '2027-05-18', '2027-05-28'),
  ('Bayern', 'Sommerferien 2027', '2027-08-02', '2027-09-13'),
  ('Bayern', 'Herbstferien 2027', '2027-11-02', '2027-11-05'),
  ('Bayern', 'Herbstferien 2027', '2027-11-17', '2027-11-17'),
  ('Bayern', 'Weihnachtsferien 2027', '2027-12-24', '2028-01-07'),
  ('Berlin', 'Winterferien 2027', '2027-02-01', '2027-02-06'),
  ('Berlin', 'Osterferien 2027', '2027-03-22', '2027-04-02'),
  ('Berlin', 'Osterferien 2027', '2027-05-07', '2027-05-07'),
  ('Berlin', 'Pfingstferien 2027', '2027-05-18', '2027-05-19'),
  ('Berlin', 'Sommerferien 2027', '2027-07-01', '2027-08-14'),
  ('Berlin', 'Herbstferien 2027', '2027-10-11', '2027-10-23'),
  ('Berlin', 'Weihnachtsferien 2027', '2027-12-22', '2027-12-31'),
  ('Brandenburg', 'Winterferien 2027', '2027-02-01', '2027-02-06'),
  ('Brandenburg', 'Osterferien 2027', '2027-03-22', '2027-04-03'),
  ('Brandenburg', 'Osterferien 2027', '2027-05-07', '2027-05-07'),
  ('Brandenburg', 'Pfingstferien 2027', '2027-05-18', '2027-05-18'),
  ('Brandenburg', 'Sommerferien 2027', '2027-07-01', '2027-08-14'),
  ('Brandenburg', 'Herbstferien 2027', '2027-10-11', '2027-10-23'),
  ('Brandenburg', 'Weihnachtsferien 2027', '2027-12-23', '2027-12-31'),
  ('Bremen', 'Winterferien 2027', '2027-02-01', '2027-02-02'),
  ('Bremen', 'Osterferien 2027', '2027-03-22', '2027-04-03'),
  ('Bremen', 'Pfingstferien 2027', '2027-05-07', '2027-05-07'),
  ('Bremen', 'Pfingstferien 2027', '2027-05-18', '2027-05-18'),
  ('Bremen', 'Sommerferien 2027', '2027-07-08', '2027-08-18'),
  ('Bremen', 'Herbstferien 2027', '2027-10-18', '2027-10-30'),
  ('Bremen', 'Weihnachtsferien 2027', '2027-12-23', '2028-01-08'),
  ('Hamburg', 'Winterferien 2027', '2027-01-29', '2027-01-30'),
  ('Hamburg', 'Fruehjahrsferien 2027', '2027-03-01', '2027-03-12'),
  ('Hamburg', 'Pfingstferien 2027', '2027-05-07', '2027-05-15'),
  ('Hamburg', 'Sommerferien 2027', '2027-07-01', '2027-08-11'),
  ('Hamburg', 'Herbstferien 2027', '2027-10-11', '2027-10-22'),
  ('Hamburg', 'Weihnachtsferien 2027', '2027-12-20', '2027-12-31'),
  ('Hessen', 'Osterferien 2027', '2027-03-22', '2027-04-02'),
  ('Hessen', 'Sommerferien 2027', '2027-06-28', '2027-08-06'),
  ('Hessen', 'Herbstferien 2027', '2027-10-04', '2027-10-16'),
  ('Hessen', 'Weihnachtsferien 2027', '2027-12-23', '2028-01-11'),
  ('Mecklenburg-Vorpommern', 'Winterferien 2027', '2027-02-08', '2027-02-19'),
  ('Mecklenburg-Vorpommern', 'Osterferien 2027', '2027-03-24', '2027-04-02'),
  ('Mecklenburg-Vorpommern', 'Pfingstferien 2027', '2027-05-07', '2027-05-07'),
  ('Mecklenburg-Vorpommern', 'Pfingstferien 2027', '2027-05-14', '2027-05-18'),
  ('Mecklenburg-Vorpommern', 'Sommerferien 2027', '2027-07-05', '2027-08-14'),
  ('Mecklenburg-Vorpommern', 'Herbstferien 2027', '2027-10-14', '2027-10-23'),
  ('Mecklenburg-Vorpommern', 'Weihnachtsferien 2027', '2027-12-22', '2028-01-04'),
  ('Niedersachsen', 'Winterferien 2027', '2027-02-01', '2027-02-02'),
  ('Niedersachsen', 'Osterferien 2027', '2027-03-22', '2027-04-03'),
  ('Niedersachsen', 'Pfingstferien 2027', '2027-05-07', '2027-05-07'),
  ('Niedersachsen', 'Pfingstferien 2027', '2027-05-18', '2027-05-18'),
  ('Niedersachsen', 'Sommerferien 2027', '2027-07-08', '2027-08-18'),
  ('Niedersachsen', 'Herbstferien 2027', '2027-10-16', '2027-10-30'),
  ('Niedersachsen', 'Weihnachtsferien 2027', '2027-12-23', '2028-01-08'),
  ('Nordrhein-Westfalen', 'Osterferien 2027', '2027-03-22', '2027-04-03'),
  ('Nordrhein-Westfalen', 'Pfingstferien 2027', '2027-05-18', '2027-05-18'),
  ('Nordrhein-Westfalen', 'Sommerferien 2027', '2027-07-19', '2027-08-31'),
  ('Nordrhein-Westfalen', 'Herbstferien 2027', '2027-10-23', '2027-11-06'),
  ('Nordrhein-Westfalen', 'Weihnachtsferien 2027', '2027-12-24', '2028-01-08'),
  ('Rheinland-Pfalz', 'Osterferien 2027', '2027-03-22', '2027-04-02'),
  ('Rheinland-Pfalz', 'Sommerferien 2027', '2027-06-28', '2027-08-06'),
  ('Rheinland-Pfalz', 'Herbstferien 2027', '2027-10-04', '2027-10-15'),
  ('Rheinland-Pfalz', 'Weihnachtsferien 2027', '2027-12-23', '2028-01-07'),
  ('Saarland', 'Winterferien 2027', '2027-02-08', '2027-02-12'),
  ('Saarland', 'Osterferien 2027', '2027-03-30', '2027-04-09'),
  ('Saarland', 'Sommerferien 2027', '2027-06-28', '2027-08-06'),
  ('Saarland', 'Herbstferien 2027', '2027-10-04', '2027-10-15'),
  ('Saarland', 'Weihnachtsferien 2027', '2027-12-20', '2027-12-31'),
  ('Sachsen', 'Winterferien 2027', '2027-02-08', '2027-02-19'),
  ('Sachsen', 'Osterferien 2027', '2027-03-26', '2027-04-02'),
  ('Sachsen', 'Pfingstferien 2027', '2027-05-07', '2027-05-07'),
  ('Sachsen', 'Pfingstferien 2027', '2027-05-15', '2027-05-18'),
  ('Sachsen', 'Sommerferien 2027', '2027-07-10', '2027-08-20'),
  ('Sachsen', 'Herbstferien 2027', '2027-10-11', '2027-10-23'),
  ('Sachsen', 'Weihnachtsferien 2027', '2027-12-23', '2028-01-01'),
  ('Sachsen-Anhalt', 'Winterferien 2027', '2027-02-01', '2027-02-06'),
  ('Sachsen-Anhalt', 'Osterferien 2027', '2027-03-22', '2027-03-27'),
  ('Sachsen-Anhalt', 'Pfingstferien 2027', '2027-05-15', '2027-05-22'),
  ('Sachsen-Anhalt', 'Sommerferien 2027', '2027-07-10', '2027-08-20'),
  ('Sachsen-Anhalt', 'Herbstferien 2027', '2027-10-18', '2027-10-23'),
  ('Sachsen-Anhalt', 'Weihnachtsferien 2027', '2027-12-20', '2027-12-31'),
  ('Schleswig-Holstein', 'Winterferien 2027', '2027-02-01', '2027-02-02'),
  ('Schleswig-Holstein', 'Osterferien 2027', '2027-03-30', '2027-04-10'),
  ('Schleswig-Holstein', 'Pfingstferien 2027', '2027-05-07', '2027-05-07'),
  ('Schleswig-Holstein', 'Sommerferien 2027', '2027-07-03', '2027-08-14'),
  ('Schleswig-Holstein', 'Herbstferien 2027', '2027-10-11', '2027-10-23'),
  ('Schleswig-Holstein', 'Weihnachtsferien 2027', '2027-12-23', '2028-01-08'),
  ('Thüringen', 'Winterferien 2027', '2027-02-01', '2027-02-06'),
  ('Thüringen', 'Osterferien 2027', '2027-03-22', '2027-04-03'),
  ('Thüringen', 'Pfingstferien 2027', '2027-05-07', '2027-05-07'),
  ('Thüringen', 'Sommerferien 2027', '2027-07-10', '2027-08-20'),
  ('Thüringen', 'Herbstferien 2027', '2027-10-09', '2027-10-23'),
  ('Thüringen', 'Weihnachtsferien 2027', '2027-12-23', '2027-12-31'),
  ('Baden-Württemberg', 'Osterferien 2028', '2028-04-13', '2028-04-13'),
  ('Baden-Württemberg', 'Osterferien 2028', '2028-04-18', '2028-04-22'),
  ('Baden-Württemberg', 'Pfingstferien 2028', '2028-06-06', '2028-06-17'),
  ('Baden-Württemberg', 'Sommerferien 2028', '2028-07-27', '2028-09-09'),
  ('Baden-Württemberg', 'Herbstferien 2028', '2028-10-30', '2028-11-03'),
  ('Baden-Württemberg', 'Weihnachtsferien 2028', '2028-12-23', '2029-01-05'),
  ('Bayern', 'Winterferien 2028', '2028-02-28', '2028-03-03'),
  ('Bayern', 'Osterferien 2028', '2028-04-10', '2028-04-21'),
  ('Bayern', 'Pfingstferien 2028', '2028-06-06', '2028-06-16'),
  ('Bayern', 'Sommerferien 2028', '2028-07-31', '2028-09-11'),
  ('Bayern', 'Herbstferien 2028', '2028-10-30', '2028-11-03'),
  ('Bayern', 'Herbstferien 2028', '2028-11-22', '2028-11-22'),
  ('Bayern', 'Weihnachtsferien 2028', '2028-12-23', '2029-01-05'),
  ('Berlin', 'Winterferien 2028', '2028-01-31', '2028-02-05'),
  ('Berlin', 'Osterferien 2028', '2028-04-10', '2028-04-22'),
  ('Berlin', 'Osterferien 2028', '2028-05-26', '2028-05-26'),
  ('Berlin', 'Pfingstferien 2028', '2028-06-01', '2028-06-02'),
  ('Berlin', 'Sommerferien 2028', '2028-07-01', '2028-08-12'),
  ('Berlin', 'Herbstferien 2028', '2028-10-02', '2028-10-14'),
  ('Berlin', 'Weihnachtsferien 2028', '2028-12-22', '2029-01-02'),
  ('Brandenburg', 'Winterferien 2028', '2028-01-31', '2028-02-05'),
  ('Brandenburg', 'Osterferien 2028', '2028-04-10', '2028-04-22'),
  ('Brandenburg', 'Osterferien 2028', '2028-05-26', '2028-05-26'),
  ('Brandenburg', 'Sommerferien 2028', '2028-06-29', '2028-08-12'),
  ('Brandenburg', 'Herbstferien 2028', '2028-10-02', '2028-10-14'),
  ('Brandenburg', 'Herbstferien 2028', '2028-10-30', '2028-10-30'),
  ('Brandenburg', 'Weihnachtsferien 2028', '2028-12-22', '2029-01-02'),
  ('Bremen', 'Winterferien 2028', '2028-01-31', '2028-02-01'),
  ('Bremen', 'Osterferien 2028', '2028-04-10', '2028-04-22'),
  ('Bremen', 'Pfingstferien 2028', '2028-05-26', '2028-05-26'),
  ('Bremen', 'Pfingstferien 2028', '2028-06-06', '2028-06-06'),
  ('Bremen', 'Sommerferien 2028', '2028-07-20', '2028-08-30'),
  ('Bremen', 'Herbstferien 2028', '2028-10-02', '2028-10-02'),
  ('Bremen', 'Herbstferien 2028', '2028-10-23', '2028-11-04'),
  ('Bremen', 'Weihnachtsferien 2028', '2028-12-27', '2029-01-06'),
  ('Hamburg', 'Winterferien 2028', '2028-01-28', '2028-01-28'),
  ('Hamburg', 'Osterferien 2028', '2028-03-06', '2028-03-17'),
  ('Hamburg', 'Pfingstferien 2028', '2028-05-22', '2028-05-26'),
  ('Hamburg', 'Sommerferien 2028', '2028-07-03', '2028-08-11'),
  ('Hamburg', 'Herbstferien 2028', '2028-10-02', '2028-10-13'),
  ('Hamburg', 'Herbstferien 2028', '2028-10-30', '2028-10-30'),
  ('Hamburg', 'Weihnachtsferien 2028', '2028-12-18', '2028-12-31'),
  ('Hessen', 'Osterferien 2028', '2028-04-03', '2028-04-14'),
  ('Hessen', 'Sommerferien 2028', '2028-07-03', '2028-08-11'),
  ('Hessen', 'Herbstferien 2028', '2028-10-09', '2028-10-20'),
  ('Hessen', 'Weihnachtsferien 2028', '2028-12-27', '2029-01-12'),
  ('Mecklenburg-Vorpommern', 'Winterferien 2028', '2028-02-05', '2028-02-17'),
  ('Mecklenburg-Vorpommern', 'Osterferien 2028', '2028-04-12', '2028-04-21'),
  ('Mecklenburg-Vorpommern', 'Osterferien 2028', '2028-05-26', '2028-05-26'),
  ('Mecklenburg-Vorpommern', 'Pfingstferien 2028', '2028-06-02', '2028-06-06'),
  ('Mecklenburg-Vorpommern', 'Sommerferien 2028', '2028-06-26', '2028-08-05'),
  ('Mecklenburg-Vorpommern', 'Herbstferien 2028', '2028-10-02', '2028-10-02'),
  ('Mecklenburg-Vorpommern', 'Herbstferien 2028', '2028-10-23', '2028-10-28'),
  ('Mecklenburg-Vorpommern', 'Herbstferien 2028', '2028-10-30', '2028-10-30'),
  ('Mecklenburg-Vorpommern', 'Weihnachtsferien 2028', '2028-12-22', '2029-01-02'),
  ('Niedersachsen', 'Winterferien 2028', '2028-01-31', '2028-02-01'),
  ('Niedersachsen', 'Osterferien 2028', '2028-04-10', '2028-04-22'),
  ('Niedersachsen', 'Pfingstferien 2028', '2028-05-26', '2028-05-26'),
  ('Niedersachsen', 'Pfingstferien 2028', '2028-06-06', '2028-06-06'),
  ('Niedersachsen', 'Sommerferien 2028', '2028-07-20', '2028-08-30'),
  ('Niedersachsen', 'Herbstferien 2028', '2028-10-02', '2028-10-02'),
  ('Niedersachsen', 'Herbstferien 2028', '2028-10-23', '2028-11-04'),
  ('Niedersachsen', 'Weihnachtsferien 2028', '2028-12-27', '2029-01-06'),
  ('Nordrhein-Westfalen', 'Osterferien 2028', '2028-04-10', '2028-04-22'),
  ('Nordrhein-Westfalen', 'Sommerferien 2028', '2028-07-10', '2028-08-22'),
  ('Nordrhein-Westfalen', 'Herbstferien 2028', '2028-10-23', '2028-11-04'),
  ('Nordrhein-Westfalen', 'Weihnachtsferien 2028', '2028-12-21', '2029-01-05'),
  ('Rheinland-Pfalz', 'Osterferien 2028', '2028-04-10', '2028-04-21'),
  ('Rheinland-Pfalz', 'Sommerferien 2028', '2028-07-03', '2028-08-11'),
  ('Rheinland-Pfalz', 'Herbstferien 2028', '2028-10-09', '2028-10-20'),
  ('Rheinland-Pfalz', 'Weihnachtsferien 2028', '2028-12-21', '2029-01-08'),
  ('Saarland', 'Winterferien 2028', '2028-02-21', '2028-02-29'),
  ('Saarland', 'Osterferien 2028', '2028-04-12', '2028-04-21'),
  ('Saarland', 'Sommerferien 2028', '2028-07-03', '2028-08-11'),
  ('Saarland', 'Herbstferien 2028', '2028-10-09', '2028-10-20'),
  ('Saarland', 'Weihnachtsferien 2028', '2028-12-20', '2029-01-02'),
  ('Sachsen', 'Winterferien 2028', '2028-02-14', '2028-02-26'),
  ('Sachsen', 'Osterferien 2028', '2028-04-14', '2028-04-22'),
  ('Sachsen', 'Osterferien 2028', '2028-05-26', '2028-05-26'),
  ('Sachsen', 'Sommerferien 2028', '2028-07-22', '2028-09-01'),
  ('Sachsen', 'Herbstferien 2028', '2028-10-23', '2028-11-03'),
  ('Sachsen', 'Weihnachtsferien 2028', '2028-12-23', '2029-01-03'),
  ('Sachsen-Anhalt', 'Winterferien 2028', '2028-02-07', '2028-02-12'),
  ('Sachsen-Anhalt', 'Osterferien 2028', '2028-04-10', '2028-04-22'),
  ('Sachsen-Anhalt', 'Pfingstferien 2028', '2028-06-03', '2028-06-10'),
  ('Sachsen-Anhalt', 'Sommerferien 2028', '2028-07-22', '2028-09-01'),
  ('Sachsen-Anhalt', 'Herbstferien 2028', '2028-10-02', '2028-10-02'),
  ('Sachsen-Anhalt', 'Herbstferien 2028', '2028-10-30', '2028-11-03'),
  ('Sachsen-Anhalt', 'Weihnachtsferien 2028', '2028-12-21', '2029-01-02'),
  ('Schleswig-Holstein', 'Winterferien 2028', '2028-01-31', '2028-01-31'),
  ('Schleswig-Holstein', 'Osterferien 2028', '2028-04-03', '2028-04-15'),
  ('Schleswig-Holstein', 'Pfingstferien 2028', '2028-05-26', '2028-05-26'),
  ('Schleswig-Holstein', 'Sommerferien 2028', '2028-06-24', '2028-08-04'),
  ('Schleswig-Holstein', 'Herbstferien 2028', '2028-10-02', '2028-10-02'),
  ('Schleswig-Holstein', 'Herbstferien 2028', '2028-10-16', '2028-10-30'),
  ('Schleswig-Holstein', 'Weihnachtsferien 2028', '2028-12-21', '2029-01-05'),
  ('Thüringen', 'Winterferien 2028', '2028-02-07', '2028-02-12'),
  ('Thüringen', 'Osterferien 2028', '2028-04-03', '2028-04-15'),
  ('Thüringen', 'Pfingstferien 2028', '2028-05-26', '2028-05-26'),
  ('Thüringen', 'Sommerferien 2028', '2028-07-22', '2028-09-01'),
  ('Thüringen', 'Herbstferien 2028', '2028-10-23', '2028-11-03'),
  ('Thüringen', 'Weihnachtsferien 2028', '2028-12-23', '2029-01-05')
on conflict do nothing;

-- END German School Holidays Seed --
