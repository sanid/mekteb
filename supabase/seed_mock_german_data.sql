-- Bosnian mock data seed for IKB Berlin (mosque_id: 5bbdf6e3-f020-40e5-bce7-cddce8e20af2).
-- Operates safely using deterministic UUIDs and ON CONFLICT handling.

-- First, clean up any previously seeded mock data with these UUIDs to prevent mixed data

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

do $$
begin
  -- Submissions
  delete from public.homework_submissions where homework_id in (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000602',
    '00000000-0000-0000-0000-000000000603',
    '00000000-0000-0000-0000-000000000604',
    '00000000-0000-0000-0000-000000000605',
    '00000000-0000-0000-0000-000000000606'
  );
  -- Assignments
  delete from public.homework_assignments where id in (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000602',
    '00000000-0000-0000-0000-000000000603',
    '00000000-0000-0000-0000-000000000604',
    '00000000-0000-0000-0000-000000000605',
    '00000000-0000-0000-0000-000000000606'
  );
  -- Attendance records
  delete from public.attendance_records where session_id in (
    '00000000-0000-0000-0000-000000000511',
    '00000000-0000-0000-0000-000000000512',
    '00000000-0000-0000-0000-000000000513',
    '00000000-0000-0000-0000-000000000521',
    '00000000-0000-0000-0000-000000000522',
    '00000000-0000-0000-0000-000000000523'
  );
  -- Attendance sessions
  delete from public.attendance_sessions where id in (
    '00000000-0000-0000-0000-000000000511',
    '00000000-0000-0000-0000-000000000512',
    '00000000-0000-0000-0000-000000000513',
    '00000000-0000-0000-0000-000000000521',
    '00000000-0000-0000-0000-000000000522',
    '00000000-0000-0000-0000-000000000523'
  );
  -- Teacher group links
  delete from public.teacher_group_links where group_id in (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000402'
  );
  -- Enrollments
  delete from public.group_enrollments where group_id in (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000402'
  );
  -- Groups
  delete from public.groups where id in (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000402'
  );
  -- Parent-Student Links
  delete from public.parent_student_links where student_profile_id in (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303',
    '00000000-0000-0000-0000-000000000304',
    '00000000-0000-0000-0000-000000000305',
    '00000000-0000-0000-0000-000000000306',
    '00000000-0000-0000-0000-000000000307',
    '00000000-0000-0000-0000-000000000308'
  );
  -- Students
  delete from public.student_profiles where id in (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303',
    '00000000-0000-0000-0000-000000000304',
    '00000000-0000-0000-0000-000000000305',
    '00000000-0000-0000-0000-000000000306',
    '00000000-0000-0000-0000-000000000307',
    '00000000-0000-0000-0000-000000000308'
  );
  -- Teacher profiles
  delete from public.teacher_profiles where id in (
    '00000000-0000-0000-0000-000000000111',
    '00000000-0000-0000-0000-000000000112',
    '00000000-0000-0000-0000-000000000113',
    '00000000-0000-0000-0000-000000000114'
  );
  -- Parent profiles
  delete from public.parent_profiles where id in (
    '00000000-0000-0000-0000-000000000221',
    '00000000-0000-0000-0000-000000000222',
    '00000000-0000-0000-0000-000000000223',
    '00000000-0000-0000-0000-000000000224',
    '00000000-0000-0000-0000-000000000225'
  );
  -- Memberships
  delete from public.memberships where user_id in (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000025'
  );
  -- Profiles
  delete from public.profiles where id in (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000025'
  );
  -- Identities
  delete from auth.identities where user_id in (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000025'
  );
  -- Users
  delete from auth.users where id in (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000025'
  );
end $$;

-- Helper function to seed auth.users and auth.identities
create or replace function app._seed_mock_auth_user(
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
  ) on conflict (id) do update set
    email = p_email,
    raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'display_name', p_full_name),
    updated_at = now();

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
  v_mosque_id uuid := '5bbdf6e3-f020-40e5-bce7-cddce8e20af2';
begin
  -- Ensure the mosque exists
  insert into public.mosques (id, name, slug, timezone, locale)
  values (v_mosque_id, 'IKB Berlin', 'ikb-berlin', 'Europe/Berlin', 'de')
  on conflict (id) do nothing;

  -- 1. Create Auth Users (Admin, Teachers and Parents with Bosnian names)
  -- Admin
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000010', 'admin@ikb-berlin.de', 'password123', 'IKB Admin');

  -- Teachers
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000011', 'alma.hodzic@ikb-berlin.de', 'password123', 'Alma Hodžić');
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000012', 'haris.delic@ikb-berlin.de', 'password123', 'Haris Delić');
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000013', 'amra.kovacevic@ikb-berlin.de', 'password123', 'Amra Kovačević');
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000014', 'mirnes.halilovic@ikb-berlin.de', 'password123', 'Mirnes Halilović');

  -- Parents
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000021', 'adnan.demirovic@mail.de', 'password123', 'Adnan Demirović');
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000022', 'jasmina.begic@mail.de', 'password123', 'Jasmina Begić');
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000023', 'elvir.hadzic@mail.de', 'password123', 'Elvir Hadžić');
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000024', 'lejla.smajic@mail.de', 'password123', 'Lejla Smajić');
  perform app._seed_mock_auth_user('00000000-0000-0000-0000-000000000025', 'mustafa.imamovic@mail.de', 'password123', 'Mustafa Imamović');

  -- 2. Create Memberships
  insert into public.memberships (user_id, mosque_id, role) values
    ('00000000-0000-0000-0000-000000000010', v_mosque_id, 'mosque_admin'),
    ('00000000-0000-0000-0000-000000000011', v_mosque_id, 'teacher'),
    ('00000000-0000-0000-0000-000000000012', v_mosque_id, 'teacher'),
    ('00000000-0000-0000-0000-000000000013', v_mosque_id, 'teacher'),
    ('00000000-0000-0000-0000-000000000014', v_mosque_id, 'teacher'),
    ('00000000-0000-0000-0000-000000000021', v_mosque_id, 'parent'),
    ('00000000-0000-0000-0000-000000000022', v_mosque_id, 'parent'),
    ('00000000-0000-0000-0000-000000000023', v_mosque_id, 'parent'),
    ('00000000-0000-0000-0000-000000000024', v_mosque_id, 'parent'),
    ('00000000-0000-0000-0000-000000000025', v_mosque_id, 'parent')
  on conflict (user_id, mosque_id, role) do nothing;

  -- 3. Create Teacher Profiles
  insert into public.teacher_profiles (id, mosque_id, profile_id, bio) values
    ('00000000-0000-0000-0000-000000000111', v_mosque_id, '00000000-0000-0000-0000-000000000011', 'Erfahrene Koranlehrerin für Kinderanfänger.'),
    ('00000000-0000-0000-0000-000000000112', v_mosque_id, '00000000-0000-0000-0000-000000000012', 'Spezialisiert auf Tajweed-Regeln und Fortgeschrittene.'),
    ('00000000-0000-0000-0000-000000000113', v_mosque_id, '00000000-0000-0000-0000-000000000013', 'Lehrerin für islamische Geschichte und Ethik.'),
    ('00000000-0000-0000-0000-000000000114', v_mosque_id, '00000000-0000-0000-0000-000000000014', 'Pädagoge mit Fokus auf interaktives Lernen.')
  on conflict (id) do nothing;

  -- 4. Create Parent Profiles
  insert into public.parent_profiles (id, mosque_id, profile_id, relation) values
    ('00000000-0000-0000-0000-000000000221', v_mosque_id, '00000000-0000-0000-0000-000000000021', 'father'),
    ('00000000-0000-0000-0000-000000000222', v_mosque_id, '00000000-0000-0000-0000-000000000022', 'mother'),
    ('00000000-0000-0000-0000-000000000223', v_mosque_id, '00000000-0000-0000-0000-000000000023', 'father'),
    ('00000000-0000-0000-0000-000000000224', v_mosque_id, '00000000-0000-0000-0000-000000000024', 'mother'),
    ('00000000-0000-0000-0000-000000000225', v_mosque_id, '00000000-0000-0000-0000-000000000025', 'father')
  on conflict (id) do nothing;

  -- 5. Create Students with Bosnian names
  insert into public.student_profiles (id, mosque_id, full_name, date_of_birth, notes) values
    ('00000000-0000-0000-0000-000000000301', v_mosque_id, 'Tarik Demirović', '2015-04-12', 'Sehr aufmerksam und hilfsbereit im Unterricht.'),
    ('00000000-0000-0000-0000-000000000302', v_mosque_id, 'Ajla Demirović', '2017-09-25', 'Spielt gerne und lernt fleißig die Buchstaben.'),
    ('00000000-0000-0000-0000-000000000303', v_mosque_id, 'Benjamin Begić', '2014-11-02', 'Liest bereits fließend Kurzsuren.'),
    ('00000000-0000-0000-0000-000000000304', v_mosque_id, 'Lana Hadžić', '2016-01-30', 'Sehr gute Aussprache bei den Tajweed-Übungen.'),
    ('00000000-0000-0000-0000-000000000305', v_mosque_id, 'Imran Hadžić', '2018-05-18', 'Braucht noch etwas Unterstützung bei den Hausaufgaben.'),
    ('00000000-0000-0000-0000-000000000306', v_mosque_id, 'Emina Smajić', '2015-08-08', 'Immer pünktlich und sehr engagiert.'),
    ('00000000-0000-0000-0000-000000000307', v_mosque_id, 'Amar Smajić', '2017-12-19', 'Ruhiger Schüler, lernt im eigenen Tempo.'),
    ('00000000-0000-0000-0000-000000000308', v_mosque_id, 'Kamil Imamović', '2016-07-15', 'Fortschritte beim Auswendiglernen sind sehr gut.')
  on conflict (id) do nothing;

  -- 6. Link Parents and Students
  insert into public.parent_student_links (mosque_id, parent_profile_id, student_profile_id, is_primary) values
    (v_mosque_id, '00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000301', true),
    (v_mosque_id, '00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000302', true),
    (v_mosque_id, '00000000-0000-0000-0000-000000000222', '00000000-0000-0000-0000-000000000303', true),
    (v_mosque_id, '00000000-0000-0000-0000-000000000223', '00000000-0000-0000-0000-000000000304', true),
    (v_mosque_id, '00000000-0000-0000-0000-000000000223', '00000000-0000-0000-0000-000000000305', true),
    (v_mosque_id, '00000000-0000-0000-0000-000000000224', '00000000-0000-0000-0000-000000000306', true),
    (v_mosque_id, '00000000-0000-0000-0000-000000000224', '00000000-0000-0000-0000-000000000307', true),
    (v_mosque_id, '00000000-0000-0000-0000-000000000225', '00000000-0000-0000-0000-000000000308', true)
  on conflict (parent_profile_id, student_profile_id) do nothing;

  -- 7. Create Groups
  insert into public.groups (id, mosque_id, name, description) values
    ('00000000-0000-0000-0000-000000000401', v_mosque_id, 'Klasse 1 (Anfänger)', 'Einführungsgruppe für jüngere Kinder und Neueinsteiger.'),
    ('00000000-0000-0000-0000-000000000402', v_mosque_id, 'Klasse 2 (Mittelstufe)', 'Für Kinder mit Vorkenntnissen im Lesen und Grundwissen.')
  on conflict (id) do nothing;

  -- 8. Enroll Students in Groups
  insert into public.group_enrollments (mosque_id, group_id, student_profile_id, enrolled_at) values
    (v_mosque_id, '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000302', '2026-04-01'), -- Ajla
    (v_mosque_id, '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000305', '2026-04-01'), -- Imran
    (v_mosque_id, '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000307', '2026-04-01'), -- Amar
    (v_mosque_id, '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000308', '2026-04-01'), -- Kamil
    (v_mosque_id, '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000301', '2026-04-01'), -- Tarik
    (v_mosque_id, '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000303', '2026-04-01'), -- Benjamin
    (v_mosque_id, '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000304', '2026-04-01'), -- Lana
    (v_mosque_id, '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000306', '2026-04-01')  -- Emina
  on conflict (group_id, student_profile_id, enrolled_at) do nothing;

  -- 9. Assign Teachers to Groups
  insert into public.teacher_group_links (mosque_id, teacher_profile_id, group_id) values
    (v_mosque_id, '00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000401'), -- Alma in Klasse 1
    (v_mosque_id, '00000000-0000-0000-0000-000000000114', '00000000-0000-0000-0000-000000000401'), -- Mirnes in Klasse 1
    (v_mosque_id, '00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000402'), -- Haris in Klasse 2
    (v_mosque_id, '00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000402')  -- Amra in Klasse 2
  on conflict (teacher_profile_id, group_id) do nothing;

  -- 10. Attendance Sessions
  insert into public.attendance_sessions (id, mosque_id, group_id, session_date, notes) values
    ('00000000-0000-0000-0000-000000000511', v_mosque_id, '00000000-0000-0000-0000-000000000401', '2026-05-02', 'Erste Session im Mai. Buchstaben Alif-Ba-Ta besprochen.'),
    ('00000000-0000-0000-0000-000000000512', v_mosque_id, '00000000-0000-0000-0000-000000000401', '2026-05-09', 'Fortsetzung Buchstaben und kurze Fragerunde.'),
    ('00000000-0000-0000-0000-000000000513', v_mosque_id, '00000000-0000-0000-0000-000000000401', '2026-05-16', 'Kurzer Test über die ersten Buchstaben.'),
    ('00000000-0000-0000-0000-000000000521', v_mosque_id, '00000000-0000-0000-0000-000000000402', '2026-05-02', 'Tajweed-Regeln Einführung (Meds).'),
    ('00000000-0000-0000-0000-000000000522', v_mosque_id, '00000000-0000-0000-0000-000000000402', '2026-05-09', 'Praktische Übungen zu Med-Regeln.'),
    ('00000000-0000-0000-0000-000000000522', v_mosque_id, '00000000-0000-0000-0000-000000000402', '2026-05-09', 'Praktische Übungen zu Med-Regeln.'),
    ('00000000-0000-0000-0000-000000000523', v_mosque_id, '00000000-0000-0000-0000-000000000402', '2026-05-16', 'Wiederholung Kurzsuren für das Gebet.')
  on conflict (id) do nothing;

  -- 11. Attendance Records
  -- Klasse 1
  insert into public.attendance_records (mosque_id, session_id, student_profile_id, status, note) values
    -- Session 2026-05-02
    (v_mosque_id, '00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000302', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000305', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000307', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000308', 'late', '10 Minuten zu spät'),
    -- Session 2026-05-09
    (v_mosque_id, '00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000302', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000305', 'absent', 'Krank gemeldet'),
    (v_mosque_id, '00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000307', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000308', 'present', null),
    -- Session 2026-05-16
    (v_mosque_id, '00000000-0000-0000-0000-000000000513', '00000000-0000-0000-0000-000000000302', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000513', '00000000-0000-0000-0000-000000000305', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000513', '00000000-0000-0000-0000-000000000307', 'excused', 'Familienfeier'),
    (v_mosque_id, '00000000-0000-0000-0000-000000000513', '00000000-0000-0000-0000-000000000308', 'present', null)
  on conflict (session_id, student_profile_id) do nothing;

  -- Klasse 2
  insert into public.attendance_records (mosque_id, session_id, student_profile_id, status, note) values
    -- Session 2026-05-02
    (v_mosque_id, '00000000-0000-0000-0000-000000000521', '00000000-0000-0000-0000-000000000301', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000521', '00000000-0000-0000-0000-000000000303', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000521', '00000000-0000-0000-0000-000000000304', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000521', '00000000-0000-0000-0000-000000000306', 'present', null),
    -- Session 2026-05-09
    (v_mosque_id, '00000000-0000-0000-0000-000000000522', '00000000-0000-0000-0000-000000000301', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000522', '00000000-0000-0000-0000-000000000303', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000522', '00000000-0000-0000-0000-000000000304', 'absent', 'Erkältet'),
    (v_mosque_id, '00000000-0000-0000-0000-000000000522', '00000000-0000-0000-0000-000000000306', 'present', null),
    -- Session 2026-05-16
    (v_mosque_id, '00000000-0000-0000-0000-000000000523', '00000000-0000-0000-0000-000000000301', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000523', '00000000-0000-0000-0000-000000000303', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000523', '00000000-0000-0000-0000-000000000304', 'present', null),
    (v_mosque_id, '00000000-0000-0000-0000-000000000523', '00000000-0000-0000-0000-000000000306', 'present', null)
  on conflict (session_id, student_profile_id) do nothing;

  -- 11.5 Lessons + topic the homework below links to. The homework rows
  -- reference these fixed lesson ids, and the mosque-invariant trigger on
  -- homework_assignments rejects rows whose lesson belongs to a different
  -- mosque (or does not exist) — so they must be created here, in this mosque.
  insert into public.topics (id, mosque_id, title, description, sort_order, is_published) values
    ('00000000-0000-0000-0000-000000000041', v_mosque_id, 'Glaubenslehre (IKB Berlin)', 'Grundlagen des Iman für Klasse 1 und 2', 1, true)
  on conflict (id) do nothing;

  insert into public.lessons (id, mosque_id, topic_id, title, body, sort_order, is_published) values
    ('00000000-0000-0000-0000-000000000003', v_mosque_id, '00000000-0000-0000-0000-000000000041', 'Die fünf Säulen des Islam', '[{"id":"mock-l-003","type":"paragraph","props":{"textColor":"default","backgroundColor":"default","textAlignment":"left"},"content":[{"type":"text","text":"Die Schehādet, das Gebet, die Zekāt, das Fasten und der Hadsch.","styles":{}}],"children":[]}]'::jsonb, 1, true),
    ('00000000-0000-0000-0000-000000000004', v_mosque_id, '00000000-0000-0000-0000-000000000041', 'Die sechs Glaubensartikel', '[{"id":"mock-l-004","type":"paragraph","props":{"textColor":"default","backgroundColor":"default","textAlignment":"left"},"content":[{"type":"text","text":"Der Iman an Allah, die Engel, die Bücher, die Gesandten, den Jüngsten Tag und Qader.","styles":{}}],"children":[]}]'::jsonb, 2, true),
    ('00000000-0000-0000-0000-000000000005', v_mosque_id, '00000000-0000-0000-0000-000000000041', 'Allahs Eigenschaften', '[{"id":"mock-l-005","type":"paragraph","props":{"textColor":"default","backgroundColor":"default","textAlignment":"left"},"content":[{"type":"text","text":"Die wichtigsten Eigenschaften Allahs, die jeder Muslim kennen muss.","styles":{}}],"children":[]}]'::jsonb, 3, true),
    ('00000000-0000-0000-0000-000000000006', v_mosque_id, '00000000-0000-0000-0000-000000000041', 'Die vier großen Engel', '[{"id":"mock-l-006","type":"paragraph","props":{"textColor":"default","backgroundColor":"default","textAlignment":"left"},"content":[{"type":"text","text":"Dscharāʾil, Mīkāʾil, Isrāfīl und ʿAzrāʾil und ihre Aufgaben.","styles":{}}],"children":[]}]'::jsonb, 4, true),
    ('00000000-0000-0000-0000-000000000007', v_mosque_id, '00000000-0000-0000-0000-000000000041', 'Die geoffenbarten Bücher', '[{"id":"mock-l-007","type":"paragraph","props":{"textColor":"default","backgroundColor":"default","textAlignment":"left"},"content":[{"type":"text","text":"Tora, Evangelium, Psalmen und der Qurʾān und ihre Propheten.","styles":{}}],"children":[]}]'::jsonb, 5, true),
    ('00000000-0000-0000-0000-000000000008', v_mosque_id, '00000000-0000-0000-0000-000000000041', 'Eigenschaften der Propheten', '[{"id":"mock-l-008","type":"paragraph","props":{"textColor":"default","backgroundColor":"default","textAlignment":"left"},"content":[{"type":"text","text":"Siddiq, Amanah, Tabligh, Fatanah und Ismah.","styles":{}}],"children":[]}]'::jsonb, 6, true)
  on conflict (id) do nothing;

  -- 12. Homework Assignments (linking to the lessons seeded above: 00000000-0000-0000-0000-000000000003 to 00000000-0000-0000-0000-000000000008)
  insert into public.homework_assignments (id, mosque_id, group_id, lesson_id, title, body, due_date, audience, is_published) values
    ('00000000-0000-0000-0000-000000000601', v_mosque_id, '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000003', 'Säulen des Islams auswendig lernen', 'Bitte lernt die 5 Säulen des Islams bis zur nächsten Unterrichtsstunde auswendig.', '2026-05-09', 'group', true),
    ('00000000-0000-0000-0000-000000000602', v_mosque_id, '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000004', 'Die 6 Glaubensartikel', 'Schreibt die 6 Glaubensartikel des Iman sauber in eure Hefte.', '2026-05-16', 'group', true),
    ('00000000-0000-0000-0000-000000000603', v_mosque_id, '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000005', 'Allahs Eigenschaften wiederholen', 'Lest den Abschnitt über Allahs Eigenschaften und bereitet euch auf eine kleine Fragerunde vor.', '2026-05-23', 'group', true),
    ('00000000-0000-0000-0000-000000000604', v_mosque_id, '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000006', 'Die vier großen Engel und ihre Aufgaben', 'Lernt die Namen und spezifischen Aufgaben der vier Erzengel auswendig.', '2026-05-09', 'group', true),
    ('00000000-0000-0000-0000-000000000605', v_mosque_id, '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000007', 'Die geoffenbarten Bücher', 'Schreibt auf, welche heiligen Bücher welchen Propheten herabgesandt wurden.', '2026-05-16', 'group', true),
    ('00000000-0000-0000-0000-000000000606', v_mosque_id, '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000008', 'Eigenschaften der Propheten', 'Lernt die fünf Pflichteigenschaften der Gesandten (Siddiq, Amanah, Tabligh, Fatanah, Ismah).', '2026-05-23', 'group', true)
  on conflict (id) do nothing;

  -- 13. Homework Submissions (Parent acknowledgments)
  insert into public.homework_submissions (mosque_id, homework_id, student_profile_id, acknowledged_by, acknowledged_at) values
    -- Homework 1
    (v_mosque_id, '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000021', '2026-05-08 19:30:00+02'),
    (v_mosque_id, '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000025', '2026-05-09 08:45:00+02'),
    -- Homework 2
    (v_mosque_id, '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000024', '2026-05-15 21:00:00+02'),
    -- Homework 4
    (v_mosque_id, '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000021', '2026-05-08 18:00:00+02'),
    (v_mosque_id, '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000022', '2026-05-09 07:30:00+02'),
    -- Homework 5
    (v_mosque_id, '00000000-0000-0000-0000-000000000605', '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000023', '2026-05-14 16:40:00+02')
  on conflict (homework_id, student_profile_id) do nothing;

end $$;

-- Clean up helper function
drop function app._seed_mock_auth_user(uuid, text, text, text);
