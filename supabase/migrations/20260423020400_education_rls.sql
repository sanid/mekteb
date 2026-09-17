-- Phase 2: RLS for lesson content, homework, attendance, and notes.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Caller is an active teacher assigned to the given group.
create or replace function app.is_teacher_of_group(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.teacher_group_links tgl
    join public.teacher_profiles tp on tp.id = tgl.teacher_profile_id
    where tgl.group_id = target_group
      and tgl.is_active
      and tp.is_active
      and tp.profile_id = auth.uid()
  );
$$;

-- Caller has at least one child currently enrolled in the given group.
create or replace function app.parent_has_group(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.group_enrollments ge
    join public.parent_student_links psl on psl.student_profile_id = ge.student_profile_id
    join public.parent_profiles pp on pp.id = psl.parent_profile_id
    where ge.group_id = target_group
      and ge.is_active
      and pp.is_active
      and pp.profile_id = auth.uid()
  );
$$;

-- Caller is linked as a parent to the given student.
create or replace function app.parent_has_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.parent_student_links psl
    join public.parent_profiles pp on pp.id = psl.parent_profile_id
    where psl.student_profile_id = target_student
      and pp.is_active
      and pp.profile_id = auth.uid()
  );
$$;

-- Caller is an active teacher of any group the given student is enrolled in.
create or replace function app.teacher_has_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.group_enrollments ge
    join public.teacher_group_links tgl on tgl.group_id = ge.group_id and tgl.is_active
    join public.teacher_profiles tp on tp.id = tgl.teacher_profile_id
    where ge.student_profile_id = target_student
      and ge.is_active
      and tp.is_active
      and tp.profile_id = auth.uid()
  );
$$;

revoke all on function app.is_teacher_of_group(uuid) from public;
revoke all on function app.parent_has_group(uuid) from public;
revoke all on function app.parent_has_student(uuid) from public;
revoke all on function app.teacher_has_student(uuid) from public;
grant execute on function app.is_teacher_of_group(uuid) to authenticated;
grant execute on function app.parent_has_group(uuid) to authenticated;
grant execute on function app.parent_has_student(uuid) to authenticated;
grant execute on function app.teacher_has_student(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.topics                enable row level security;
alter table public.lessons               enable row level security;
alter table public.lesson_resources      enable row level security;
alter table public.homework_assignments  enable row level security;
alter table public.homework_targets      enable row level security;
alter table public.attendance_sessions   enable row level security;
alter table public.attendance_records    enable row level security;
alter table public.progress_notes        enable row level security;
alter table public.teacher_weekly_notes  enable row level security;

-- ---------------------------------------------------------------------------
-- topics + lessons + resources: any mosque member reads published content;
-- admins and teachers write.
-- ---------------------------------------------------------------------------

create policy topics_select
  on public.topics for select
  to authenticated
  using (
    app.is_platform_owner()
    or (app.is_member(mosque_id) and (is_published or app.has_role(mosque_id, 'mosque_admin') or app.has_role(mosque_id, 'teacher')))
  );

create policy topics_write
  on public.topics for all
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
    or app.is_platform_owner()
  )
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
    or app.is_platform_owner()
  );

create policy lessons_select
  on public.lessons for select
  to authenticated
  using (
    app.is_platform_owner()
    or (app.is_member(mosque_id) and (is_published or app.has_role(mosque_id, 'mosque_admin') or app.has_role(mosque_id, 'teacher')))
  );

create policy lessons_write
  on public.lessons for all
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
    or app.is_platform_owner()
  )
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
    or app.is_platform_owner()
  );

create policy lesson_resources_select
  on public.lesson_resources for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.is_member(mosque_id)
  );

create policy lesson_resources_write
  on public.lesson_resources for all
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
    or app.is_platform_owner()
  )
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
    or app.is_platform_owner()
  );

-- ---------------------------------------------------------------------------
-- homework_assignments
-- ---------------------------------------------------------------------------
-- Read access:
--   * admins + platform owners
--   * teachers of the homework's group
--   * parents with a child enrolled in the group AND either audience=group
--     or the child is in homework_targets
--   * students enrolled in the group AND either audience=group or they are
--     in homework_targets (students will get this once they have logins)
-- Write access:
--   * admins + teachers of the group

create policy homework_assignments_select
  on public.homework_assignments for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
    or (
      is_published
      and audience = 'group'
      and app.parent_has_group(group_id)
    )
    or (
      is_published
      and audience = 'individual'
      and exists (
        select 1
        from public.homework_targets ht
        where ht.homework_id = homework_assignments.id
          and (
            app.parent_has_student(ht.student_profile_id)
            or exists (
              select 1 from public.student_profiles sp
              where sp.id = ht.student_profile_id and sp.profile_id = auth.uid()
            )
          )
      )
    )
  );

create policy homework_assignments_write
  on public.homework_assignments for all
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
  )
  with check (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
  );

-- ---------------------------------------------------------------------------
-- homework_targets
-- ---------------------------------------------------------------------------

create policy homework_targets_select
  on public.homework_targets for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.parent_has_student(student_profile_id)
    or exists (
      select 1 from public.student_profiles sp
      where sp.id = student_profile_id and sp.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.homework_assignments h
      where h.id = homework_targets.homework_id
        and app.is_teacher_of_group(h.group_id)
    )
  );

create policy homework_targets_write
  on public.homework_targets for all
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or exists (
      select 1 from public.homework_assignments h
      where h.id = homework_targets.homework_id
        and app.is_teacher_of_group(h.group_id)
    )
  )
  with check (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or exists (
      select 1 from public.homework_assignments h
      where h.id = homework_targets.homework_id
        and app.is_teacher_of_group(h.group_id)
    )
  );

-- ---------------------------------------------------------------------------
-- attendance_sessions + attendance_records
-- ---------------------------------------------------------------------------

create policy attendance_sessions_select
  on public.attendance_sessions for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
    or app.parent_has_group(group_id)
  );

create policy attendance_sessions_write
  on public.attendance_sessions for all
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
  )
  with check (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
  );

create policy attendance_records_select
  on public.attendance_records for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_student(student_profile_id)
    or app.parent_has_student(student_profile_id)
    or exists (
      select 1 from public.student_profiles sp
      where sp.id = student_profile_id and sp.profile_id = auth.uid()
    )
  );

create policy attendance_records_write
  on public.attendance_records for all
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or exists (
      select 1 from public.attendance_sessions s
      where s.id = attendance_records.session_id
        and app.is_teacher_of_group(s.group_id)
    )
  )
  with check (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or exists (
      select 1 from public.attendance_sessions s
      where s.id = attendance_records.session_id
        and app.is_teacher_of_group(s.group_id)
    )
  );

-- ---------------------------------------------------------------------------
-- progress_notes
-- ---------------------------------------------------------------------------

create policy progress_notes_select
  on public.progress_notes for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_student(student_profile_id)
    or author_profile_id = auth.uid()
    or (visible_to_parents and app.parent_has_student(student_profile_id))
    or exists (
      select 1 from public.student_profiles sp
      where sp.id = progress_notes.student_profile_id and sp.profile_id = auth.uid()
    )
  );

create policy progress_notes_write
  on public.progress_notes for all
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_student(student_profile_id)
    or (author_profile_id = auth.uid() and app.is_teacher_of_group(group_id))
  )
  with check (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_student(student_profile_id)
    or (author_profile_id = auth.uid() and app.is_teacher_of_group(group_id))
  );

-- ---------------------------------------------------------------------------
-- teacher_weekly_notes
-- ---------------------------------------------------------------------------

create policy teacher_weekly_notes_select
  on public.teacher_weekly_notes for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
    or (is_published and app.parent_has_group(group_id))
  );

create policy teacher_weekly_notes_write
  on public.teacher_weekly_notes for all
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
  )
  with check (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
  );
