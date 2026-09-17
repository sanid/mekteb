-- Bosnian large-scale seed for Mekteb Dev Mosque.
-- Adds: 20 teachers (8 also examiner, 5 assistant), ~80 parents, 150 students,
--        25 groups, exam data across all stages, attendance, lesson completions,
--        homework, progress notes, teaching sessions.
--
-- Uses deterministic UUIDs in the range A000xxxx-...-00000000A0xx
-- to avoid collisions with seed.sql (0000...) and seed_mock_german_data.sql.
--
-- Idempotent: wraps everything in DO $$ with ON CONFLICT handling.

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

do $seed$
declare
  v_mosque_id  uuid := '5bbdf6e3-f020-40e5-bce7-cddce8e20af2';
  v_admin_id   uuid := '00000000-0000-0000-0000-000000000001';

  -- Arrays of Bosnian names
  v_first_names_m text[] := array[
    'Adnan','Ahmed','Aldin','Alija','Amar','Amin','Armin','Asim','Bakir','Džemal',
    'Edin','Ehlimana','Emir','Enis','Emin','Faris','Haris','Hasan','Husejn','Ibrahim',
    'Irfan','Ismet','Jasmin','Kenan','Lejmen','Mehmed','Mensur','Mirnes','Muhamed','Muamer',
    'Nedim','Nihad','Omer','Rijad','Safet','Salih','Samir','Sanin','Senad','Tarik',
    'Vedad','Zijad','Zlatan','Nermin','Elvir','Dženan','Anel','Alen','Džavid','Emir'
  ];
  v_first_names_f text[] := array[
    'Ajla','Alma','Amila','Amina','Amra','Arnela','Aida','Belma','Dina','Emina',
    'Enisa','Esma','Fatima','Hana','Hedija','Indira','Jasmina','Kerima','Lamija','Lejla',
    'Mersada','Mirela','Meliha','Nadira','Naida','Nermina','Nura','Rabija','Sadžida','Selma',
    'Sumeja','Vildana','Zerina','Zulejha','Adisa','Azra','Benisa','Denana','Erzana','Fadila',
    'Halida','Ilma','Jasna','Kada','Latifa','Maida','Nafija','Opuzena','Šefika','Umihana'
  ];
  v_last_names text[] := array[
    'Agić','Begić','Čehajić','Delalić','Elezović','Fazlić','Gazić','Hadžić','Ibrahimović',
    'Imamović','Jahić','Karić','Karadžozović','Latić','Mahmutović','Mehmedović','Mujagić',
    'Mujkanović','Muratović','Musić','Numanović','Omanović','Omerović','Pašić','Pjanić',
    'Ramić','Salihović','Spahić','Suljić','Softić','Šehović','Tiro','Talić','Uzunović',
    'Velić','Zukić','Zlatar','Hrnjičević','Okić','Bajrić','Hasanefendić','Huremović',
    'Kavazović','Kazazović','Kulenović','Kurtagić','Ljubijankić','Maledžić','Malkoč',
    'Mulabdić'
  ];

  -- teacher data: first_name, last_name, role tags
  v_teachers text[] := array[
    'Haris:Spahić:teacher:examiner',
    'Amir:Hadžić:teacher:examiner',
    'Nedim:Karić:teacher:examiner',
    'Senad:Mahmutović:teacher:examiner',
    'Ermin:Begić:teacher:examiner',
    'Adnan:Omanović:teacher:examiner',
    'Irfan:Mujagić:teacher:examiner',
    'Muhamed:Zukić:teacher:examiner',
    'Emir:Delalić:teacher',
    'Džemal:Pašić:teacher',
    'Kenan:Omerović:teacher',
    'Tarik:Fazlić:teacher',
    'Mirnes:Karadžozović:teacher',
    'Amar:Salihović:teacher',
    'Jasmin:Imamović:teacher',
    'Hasan:Huremović:teacher',
    'Lejmen:Musić:assistant',
    'Ehlimana:Ramić:assistant',
    'Ibrahim:Tiro:assistant',
    'Safet:Velić:assistant'
  ];

  -- group names for 25 groups across 3 categories
  v_group_names text[] := array[
    'Hifz I','Hifz II','Hifz III','Hifz IV','Hifz V','Hifz VI','Hifz VII','Hifz VIII',
    'Tajweed I','Tajweed II','Tajweed III','Tajweed IV','Tajweed V','Tajweed VI',
    'Mekteb I','Mekteb II','Mekteb III','Mekteb IV','Mekteb V','Mekteb VI',
    'Mekteb VII','Mekteb VIII','Mekteb IX','Mekteb X','Mekteb XI'
  ];

  -- category UUIDs
  v_cat_hifz    uuid := '11111111-1111-1111-1111-111111111111';
  v_cat_tajweed uuid := '22222222-2222-2222-2222-222222222222';
  v_cat_mekteb  uuid := '33333333-3333-3333-3333-333333333333';

  -- loop vars
  v_i             int;
  v_j             int;
  v_k             int;
  v_teacher_auth  uuid;
  v_teacher_pf    uuid;
  v_teacher_parts text[];
  v_teacher_fn    text;
  v_teacher_ln    text;
  v_teacher_roles text[];
  v_role_part     text;
  v_email         text;

  v_parent_auth   uuid;
  v_parent_pf     uuid;

  v_student_id    uuid;
  v_student_fn    text;
  v_student_ln    text;
  v_group_id      uuid;
  v_group_rec     record;
  v_student_rec   record;
  v_cat_id        uuid;

  v_topic_id      uuid;
  v_lesson_id     uuid;

  v_att_sess      uuid;
  v_sess_date     date;
  v_att_count     int;
  v_att_status    app.attendance_status;
  v_hw_id         uuid;

  v_exam_req_id   uuid;
  v_exam_sess_id  uuid;
  v_examiner_pf   uuid;
  v_exam_status   text;

  v_ts_date       date;
  v_ts_id         uuid;

  v_seed_auth     text;
  v_seed_auth_id  uuid;

  v_random_idx    int;
  v_group_cat     text;
  v_num_students  int;
  v_students_in_group uuid[];
  v_student_iter  int;

  v_topic_ids     uuid[];
  v_lesson_ids    uuid[];

  v_examiner_pfs  uuid[];
  v_all_group_ids uuid[];
begin
  -- ===================================================================
  -- 0. Re-seed existing auth helper (idempotent)
  -- ===================================================================
  create or replace function app._seed_bosnian_auth_user(
    p_id uuid, p_email text, p_password text, p_full_name text
  ) returns void
  language plpgsql
  as $func$
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

    insert into public.profiles (id, full_name)
    values (p_id, p_full_name)
    on conflict (id) do update set full_name = excluded.full_name;
  end;
  $func$;

  -- ===================================================================
  -- 1. Create 20 teachers (with auth accounts)
  -- ===================================================================
  for v_i in 1..array_length(v_teachers, 1) loop
    v_teacher_parts := string_to_array(v_teachers[v_i], ':');
    v_teacher_fn    := v_teacher_parts[1];
    v_teacher_ln    := v_teacher_parts[2];
    v_teacher_roles := v_teacher_parts[3:array_length(v_teacher_parts, 1)];

    v_teacher_auth := ('a0000000-0000-0000-0000-00000000' || lpad(v_i::text, 4, '0'))::uuid;
    v_email := lower(replace(v_teacher_fn || '.' || v_teacher_ln, 'ć', 'c')) || '@mekteb.test';

    perform app._seed_bosnian_auth_user(
      v_teacher_auth, v_email, 'password123',
      v_teacher_fn || ' ' || v_teacher_ln
    );

    -- memberships
    for v_j in 3..array_length(v_teacher_parts, 1) loop
      insert into public.memberships (user_id, mosque_id, role)
      values (v_teacher_auth, v_mosque_id, v_teacher_parts[v_j]::app.app_role)
      on conflict do nothing;
    end loop;

    -- teacher_profile
    insert into public.teacher_profiles (mosque_id, profile_id, bio)
    values (v_mosque_id, v_teacher_auth,
            v_teacher_fn || ' ' || v_teacher_ln || ' — seeded teacher')
    returning id into v_teacher_pf;

    -- collect examiner profile IDs for later
    if v_teacher_roles @> '{examiner}' then
      v_examiner_pfs := array_append(v_examiner_pfs, v_teacher_pf);
    end if;
  end loop;

  -- ===================================================================
  -- 2. Create 25 groups
  -- ===================================================================
  for v_i in 1..25 loop
    if v_i <= 8 then
      v_cat_id := v_cat_hifz;
    elsif v_i <= 14 then
      v_cat_id := v_cat_tajweed;
    else
      v_cat_id := v_cat_mekteb;
    end if;

    insert into public.groups (id, mosque_id, name, description, category_id)
    values (
      ('a0000100-0000-0000-0000-00000000' || lpad(v_i::text, 4, '0'))::uuid,
      v_mosque_id,
      v_group_names[v_i],
      'Grupa ' || v_group_names[v_i] || ' — auto-seed',
      v_cat_id
    ) on conflict (id) do update set name = excluded.name, category_id = excluded.category_id
    returning id into v_group_id;

    v_all_group_ids := array_append(v_all_group_ids, v_group_id);
  end loop;

  -- ===================================================================
  -- 3. Assign teachers to groups (2-3 teachers per group)
  -- ===================================================================
  for v_i in 1..25 loop
    v_group_id := v_all_group_ids[v_i];

    -- assign 2-3 teachers from the pool
    for v_j in 0..2 loop
      -- deterministic assignment: teacher index cycles
      v_k := ((v_i - 1) * 3 + v_j) % 20 + 1;

      select tp.id into v_teacher_pf
      from public.teacher_profiles tp
      where tp.profile_id = ('a0000000-0000-0000-0000-00000000' || lpad(v_k::text, 4, '0'))::uuid
        and tp.is_active
      limit 1;

      if v_teacher_pf is not null then
        insert into public.teacher_group_links (mosque_id, teacher_profile_id, group_id)
        values (v_mosque_id, v_teacher_pf, v_group_id)
        on conflict do nothing;
      end if;
    end loop;
  end loop;

  -- ===================================================================
  -- 4. Create ~80 parents (auth accounts)
  -- ===================================================================
  for v_i in 1..80 loop
    v_random_idx := (v_i * 7 + 3) % array_length(v_first_names_m, 1) + 1;
    v_parent_auth := ('a0000200-0000-0000-0000-00000000' || lpad(v_i::text, 4, '0'))::uuid;

    if v_i % 2 = 0 then
      v_email := 'parent' || v_i || '@mekteb.test';
    else
      v_email := 'roditelj' || v_i || '@mekteb.test';
    end if;

    perform app._seed_bosnian_auth_user(
      v_parent_auth, v_email, 'password123',
      case v_i % 2
        when 0 then v_first_names_m[v_random_idx] || ' ' || v_last_names[(v_i * 3) % array_length(v_last_names, 1) + 1]
        else v_first_names_f[v_random_idx] || ' ' || v_last_names[(v_i * 5) % array_length(v_last_names, 1) + 1]
      end
    );

    insert into public.memberships (user_id, mosque_id, role)
    values (v_parent_auth, v_mosque_id, 'parent')
    on conflict do nothing;

    insert into public.parent_profiles (mosque_id, profile_id, relation)
    values (v_mosque_id, v_parent_auth,
            case when v_i % 3 = 0 then 'mother' when v_i % 3 = 1 then 'father' else 'guardian' end)
    returning id into v_parent_pf;

    -- store parent profile id for linking later (we'll link within student creation)
  end loop;

  -- ===================================================================
  -- 5. Create 150 students, distribute across groups, link parents
  -- ===================================================================
  for v_i in 1..150 loop
    -- alternating male/female names
    if v_i % 2 = 0 then
      v_student_fn := v_first_names_m[(v_i * 3) % array_length(v_first_names_m, 1) + 1];
    else
      v_student_fn := v_first_names_f[(v_i * 7) % array_length(v_first_names_f, 1) + 1];
    end if;
    v_student_ln := v_last_names[(v_i * 11) % array_length(v_last_names, 1) + 1];

    insert into public.student_profiles (mosque_id, full_name, date_of_birth)
    values (v_mosque_id, v_student_fn || ' ' || v_student_ln,
            ('2010-01-01'::date + (v_i * 17 || ' days')::interval)::date)
    returning id into v_student_id;

    -- assign to group: roughly 6 students per group
    v_group_id := v_all_group_ids[((v_i - 1) % 25) + 1];

    insert into public.group_enrollments (mosque_id, group_id, student_profile_id, enrolled_at)
    values (v_mosque_id, v_group_id, v_student_id, '2025-09-01'::date)
    on conflict do nothing;

    -- link to a parent: roughly 2 students per parent
    v_parent_auth := ('a0000200-0000-0000-0000-00000000' || lpad((((v_i - 1) / 2 + 1)::int)::text, 4, '0'))::uuid;

    select pp.id into v_parent_pf
    from public.parent_profiles pp
    where pp.profile_id = v_parent_auth and pp.mosque_id = v_mosque_id
    limit 1;

    if v_parent_pf is not null then
      insert into public.parent_student_links (mosque_id, parent_profile_id, student_profile_id, is_primary)
      values (v_mosque_id, v_parent_pf, v_student_id, (v_i % 2 = 0))
      on conflict do nothing;
    end if;
  end loop;

  -- ===================================================================
  -- 6. Collect existing lessons for mosque
  -- ===================================================================
  select array_agg(id order by sort_order) into v_lesson_ids
  from public.lessons
  where mosque_id = v_mosque_id;

  -- ===================================================================
  -- 7. Lesson completions — complete lessons for students
  -- ===================================================================
  if v_lesson_ids is not null and array_length(v_lesson_ids, 1) > 0 then
    for v_student_id in (
      select sp.id from public.student_profiles sp where sp.mosque_id = v_mosque_id
        and sp.full_name not in ('Amina Demirović', 'Yusuf Hadžić', 'Layla Begić')
    ) loop
      for v_j in 1..array_length(v_lesson_ids, 1) loop
        -- deterministic "random": complete lessons where (student_index * lesson_index) % 5 < 3
        if (abs(('x'||replace(v_student_id::text, '-', ''))::bit(32)::int)::bigint % 997 * v_j) % 5 < 3 then
          insert into public.lesson_completions (mosque_id, student_profile_id, lesson_id, created_by)
          values (v_mosque_id, v_student_id, v_lesson_ids[v_j], v_admin_id)
          on conflict do nothing;
        end if;
      end loop;
    end loop;
  end if;

  -- ===================================================================
  -- 8. Attendance — 10 sessions per group over past 10 weeks
  -- ===================================================================
  for v_i in 1..25 loop
    v_group_id := v_all_group_ids[v_i];

    for v_j in 0..9 loop
      v_sess_date := current_date - (v_j * 7 + v_i % 3)::int;

      -- check unique constraint
      continue when exists (
        select 1 from public.attendance_sessions
        where group_id = v_group_id and session_date = v_sess_date
      );

      insert into public.attendance_sessions (mosque_id, group_id, session_date, created_by)
      values (v_mosque_id, v_group_id, v_sess_date, v_admin_id)
      returning id into v_att_sess;

      -- attendance records for enrolled students
      for v_student_rec in (
        select ge.student_profile_id
        from public.group_enrollments ge
        where ge.group_id = v_group_id and ge.is_active
      ) loop
        v_att_status := case (abs(('x'||replace(v_student_rec.student_profile_id::text, '-', ''))::bit(32)::int)::bigint % 997 + v_j * 7) % 10
          when 0 then 'absent'
          when 1 then 'late'
          when 2 then 'excused'
          else 'present'
        end;

        insert into public.attendance_records
          (mosque_id, session_id, student_profile_id, status, created_by)
        values (v_mosque_id, v_att_sess, v_student_rec.student_profile_id, v_att_status, v_admin_id)
        on conflict do nothing;
      end loop;
    end loop;
  end loop;

  -- ===================================================================
  -- 9. Homework — 3 assignments per group, some with submissions
  -- ===================================================================
  for v_i in 1..25 loop
    v_group_id := v_all_group_ids[v_i];

    for v_j in 1..3 loop
      insert into public.homework_assignments
        (mosque_id, group_id, title, due_date, audience, is_published, created_by)
      values (
        v_mosque_id, v_group_id,
        'Zadaća ' || v_j || ' — ' || v_group_names[v_i],
        current_date - (v_j * 14)::int,
        'group', true, v_admin_id
      ) returning id into v_hw_id;

      -- ~50% of students acknowledged
      for v_student_rec in (
        select ge.student_profile_id
        from public.group_enrollments ge
        where ge.group_id = v_group_id and ge.is_active
      ) loop
        if (abs(('x'||replace(v_student_rec.student_profile_id::text, '-', ''))::bit(32)::int) + v_j) % 3 = 0 then
          insert into public.homework_submissions
            (mosque_id, homework_id, student_profile_id, acknowledged_by, created_by)
          values (v_mosque_id, v_hw_id, v_student_rec.student_profile_id, v_admin_id, v_admin_id)
          on conflict do nothing;
        end if;
      end loop;
    end loop;
  end loop;

  -- ===================================================================
  -- 10. Progress notes — 2 per student
  -- ===================================================================
  for v_student_rec in (
    select sp.id as sid, ge.group_id as gid
    from public.student_profiles sp
    join public.group_enrollments ge on ge.student_profile_id = sp.id and ge.is_active
    where sp.mosque_id = v_mosque_id
      and sp.full_name not in ('Amina Demirović', 'Yusuf Hadžić', 'Layla Begić')
    limit 150
  ) loop
    -- visible note
    insert into public.progress_notes
      (mosque_id, student_profile_id, group_id, body, visible_to_parents, created_by)
    values (v_mosque_id, v_student_rec.sid, v_student_rec.gid,
            'Učenik redovno prisustvuje časovima i napreduje.', true, v_admin_id);

    -- internal note (50% of students)
    if abs(('x'||replace(v_student_rec.sid::text, '-', ''))::bit(32)::int) % 2 = 0 then
      insert into public.progress_notes
        (mosque_id, student_profile_id, group_id, body, visible_to_parents, created_by)
      values (v_mosque_id, v_student_rec.sid, v_student_rec.gid,
              'Interna napomena: potrebna dodatna pažnja na tehniku učenja.', false, v_admin_id);
    end if;
  end loop;

  -- ===================================================================
  -- 11. Exams — spread across all statuses
  -- ===================================================================
  -- We'll create exam_requests + exam_sessions for a selection of students
  -- Statuses: pending, accepted, proposed, scheduled, in_progress, passed, failed, cancelled

  v_k := 0;
  for v_student_rec in (
    select sp.id as sid, ge.group_id as gid
    from public.student_profiles sp
    join public.group_enrollments ge on ge.student_profile_id = sp.id and ge.is_active
    where sp.mosque_id = v_mosque_id
      and sp.full_name not in ('Amina Demirović', 'Yusuf Hadžić', 'Layla Begić')
    order by sp.id
  ) loop
    v_k := v_k + 1;
    -- ~40% of students have exam data (60 students)
    continue when v_k > 60;

    -- pick an examiner (round-robin)
    v_examiner_pf := v_examiner_pfs[((v_k - 1) % array_length(v_examiner_pfs, 1)) + 1];

    -- get a teacher from this group for requested_by
    select tp.id into v_teacher_pf
    from public.teacher_group_links tgl
    join public.teacher_profiles tp on tp.id = tgl.teacher_profile_id
    where tgl.group_id = v_student_rec.gid and tgl.is_active
    limit 1;

    if v_teacher_pf is null then
      -- fallback: use first examiner
      v_teacher_pf := v_examiner_pfs[1];
    end if;

    -- cycle through statuses
    v_exam_status := case v_k % 8
      when 1 then 'pending'
      when 2 then 'accepted'
      when 3 then 'proposed'
      when 4 then 'scheduled'
      when 5 then 'in_progress'
      when 6 then 'passed'
      when 7 then 'failed'
      else 'cancelled'
    end;

    -- exam_request
    insert into public.exam_requests
      (mosque_id, student_profile_id, group_id, requested_by, status, created_by, updated_by)
    values (v_mosque_id, v_student_rec.sid, v_student_rec.gid, v_teacher_pf,
            case v_exam_status
              when 'proposed' then 'accepted'
              when 'scheduled' then 'accepted'
              when 'in_progress' then 'accepted'
              when 'passed' then 'completed'
              when 'failed' then 'completed'
              when 'cancelled' then 'cancelled'
              else 'pending'
            end,
            v_admin_id, v_admin_id)
    returning id into v_exam_req_id;

    -- exam_session (only for accepted+ statuses)
    if v_exam_status not in ('pending') then
      -- determine target group for passed exams
      declare
        v_to_group uuid;
      begin
        v_to_group := null;
        if v_exam_status = 'passed' then
          -- promote to next group in same category
          select g.id into v_to_group
          from public.groups g
          where g.mosque_id = v_mosque_id
            and g.category_id = (select category_id from public.groups where id = v_student_rec.gid)
            and g.id > v_student_rec.gid
          order by g.id limit 1;
        end if;

        insert into public.exam_sessions
          (mosque_id, exam_request_id, student_profile_id, examiner_profile_id,
           from_group_id, to_group_id, status, exam_date, summary,
           oral_required, oral_passed, written_required, written_passed,
           proposed_date, proposed_by, schedule_status,
           created_by, updated_by)
        values (
          v_mosque_id, v_exam_req_id, v_student_rec.sid, v_examiner_pf,
          v_student_rec.gid, v_to_group,
          case v_exam_status
            when 'accepted' then 'proposed'
            when 'proposed' then 'proposed'
            when 'scheduled' then 'scheduled'
            when 'in_progress' then 'in_progress'
            when 'passed' then 'passed'
            when 'failed' then 'failed'
            when 'cancelled' then 'cancelled'
          end,
          current_date - (v_k % 30)::int,
          case v_exam_status
            when 'passed' then 'Uspješno položen ispit.'
            when 'failed' then 'Ispit nije položen. Potrebno ponavljanje.'
            when 'cancelled' then 'Otkazano.'
            else null
          end,
          true,
          case v_exam_status when 'passed' then true when 'failed' then false else null end,
          true,
          case v_exam_status when 'passed' then true when 'failed' then false else null end,
          case v_exam_status
            when 'proposed' then current_date + (v_k % 14)::int
            when 'scheduled' then current_date + (v_k % 7)::int
            else null
          end,
          case v_exam_status
            when 'proposed' then 'examiner'
            when 'scheduled' then 'examiner'
            else null
          end,
          case v_exam_status
            when 'proposed' then 'proposed'
            when 'scheduled' then 'confirmed'
            when 'in_progress' then 'confirmed'
            when 'passed' then 'confirmed'
            when 'failed' then 'confirmed'
            when 'cancelled' then 'proposed'
            else 'proposed'
          end,
          v_admin_id, v_admin_id
        ) returning id into v_exam_sess_id;

        -- for passed exams, deactivate old enrollment + create new one
        if v_exam_status = 'passed' and v_to_group is not null then
          update public.group_enrollments
            set is_active = false, ended_at = current_date - (v_k % 30)::int
            where student_profile_id = v_student_rec.sid
              and group_id = v_student_rec.gid and is_active;

          insert into public.group_enrollments (mosque_id, group_id, student_profile_id, enrolled_at)
          values (v_mosque_id, v_to_group, v_student_rec.sid, current_date - (v_k % 30)::int)
          on conflict do nothing;
        end if;

        -- stamp diploma_generated_at for some passed exams
        if v_exam_status = 'passed' and v_k % 3 = 0 then
          update public.exam_sessions
            set diploma_generated_at = now() - (v_k || ' days')::interval
            where id = v_exam_sess_id;
        end if;
      end;
    end if;
  end loop;

  -- ===================================================================
  -- 12. Teaching sessions — past 4 weeks, 2 per group per week
  -- ===================================================================
  for v_i in 1..25 loop
    v_group_id := v_all_group_ids[v_i];

    for v_j in 0..3 loop
      for v_k in 0..1 loop
        v_ts_date := current_date - (v_j * 7 + v_k * 3 + v_i % 2)::int;

        -- skip if already exists
        continue when exists (
          select 1 from public.teaching_sessions
          where group_id = v_group_id and date = v_ts_date
        );

        insert into public.teaching_sessions
          (mosque_id, date, group_id, start_time, end_time, is_cancelled, notes)
        values (
          v_mosque_id, v_ts_date, v_group_id,
          ('10:00'::time + (v_i % 3 || ' hours')::interval),
          ('12:00'::time + (v_i % 3 || ' hours')::interval),
          v_i % 10 = 0,  -- ~10% cancelled
          case v_i % 5
            when 0 then 'Zamjena nastavnika'
            else null
          end
        )
        on conflict do nothing;
      end loop;
    end loop;
  end loop;

  -- ===================================================================
  -- 13. Teacher weekly notes — 1 per group per week for last 3 weeks
  -- ===================================================================
  for v_i in 1..25 loop
    v_group_id := v_all_group_ids[v_i];

    -- get a teacher's profile_id (auth user id) for this group
    select tp.profile_id into v_teacher_auth
    from public.teacher_group_links tgl
    join public.teacher_profiles tp on tp.id = tgl.teacher_profile_id
    where tgl.group_id = v_group_id and tgl.is_active
    limit 1;

    for v_j in 0..2 loop
      insert into public.teacher_weekly_notes
        (mosque_id, group_id, author_profile_id, week_start, body, is_published, created_by)
      values (
        v_mosque_id, v_group_id, v_teacher_auth,
        (current_date - (v_j * 7 + 3)::int - '3 days'::interval)::date,
        'Sedmični izvještaj za grupu ' || v_group_names[v_i] || ', sedmica ' || (3 - v_j) || '.',
        v_j < 2,  -- last week is draft
        v_admin_id
      )
      on conflict do nothing;
    end loop;
  end loop;

  -- ===================================================================
  -- 14. Teaching schedules — recurring weekly slots
  -- ===================================================================
  for v_i in 1..25 loop
    v_group_id := v_all_group_ids[v_i];

    insert into public.teaching_schedules
      (mosque_id, group_id, day_of_week, start_time, end_time)
    values (
      v_mosque_id, v_group_id,
      (v_i - 1) % 6,  -- 0=Sun..5=Fri (skip Saturday)
      ('10:00'::time + ((v_i % 4) || ' hours')::interval),
      ('12:00'::time + ((v_i % 4) || ' hours')::interval)
    )
    on conflict do nothing;

    -- some groups have a second day
    if v_i % 3 = 0 then
      insert into public.teaching_schedules
        (mosque_id, group_id, day_of_week, start_time, end_time)
      values (
        v_mosque_id, v_group_id,
        ((v_i - 1) % 6 + 2) % 6,
        ('14:00'::time + ((v_i % 3) || ' hours')::interval),
        ('16:00'::time + ((v_i % 3) || ' hours')::interval)
      )
      on conflict do nothing;
    end if;
  end loop;

  -- ===================================================================
  -- Platform owner account (for /platform-admin)
  -- Login: platform@mekteb.test / password123
  -- ===================================================================
  perform app._seed_bosnian_auth_user(
    'f0000000-0000-0000-0000-000000000001'::uuid,
    'platform@mekteb.test',
    'password123',
    'Platform Owner'
  );

  insert into public.memberships (user_id, mosque_id, role, is_active)
  values (
    'f0000000-0000-0000-0000-000000000001'::uuid,
    v_mosque_id,
    'platform_owner',
    true
  ) on conflict do nothing;

  -- ===================================================================
  -- Cleanup: drop helper function
  -- ===================================================================
  drop function if exists app._seed_bosnian_auth_user(uuid, text, text, text);

end;
$seed$;
