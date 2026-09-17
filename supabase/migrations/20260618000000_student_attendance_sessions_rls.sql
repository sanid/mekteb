-- Let students see the attendance sessions their own records belong to.
--
-- `attendance_records_select` already lets a student read their own rows, but
-- `attendance_sessions_select` covered only platform owners, admins, teachers
-- of the group and parents. Every read of a student's attendance joins the
-- two — `/api/v1/student/attendance` selects `attendance_sessions!inner(...)`,
-- and the web portal does the same — so the inner join dropped every row and
-- the student saw an empty history no matter how many times they were marked
-- present.
--
-- Adds the missing student clause, scoped to groups the student is actively
-- enrolled in. Mirrors `app.parent_has_group`.

create or replace function app.student_in_group(target_group uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, app
as $$
  select exists (
    select 1
    from public.group_enrollments ge
    join public.student_profiles sp on sp.id = ge.student_profile_id
    where ge.group_id = target_group
      and ge.is_active
      and sp.is_active
      and sp.profile_id = auth.uid()
  );
$$;

comment on function app.student_in_group(uuid) is
  'True when the signed-in user is a student actively enrolled in the given group. Security definer to avoid recursive RLS evaluation on group_enrollments.';

revoke all on function app.student_in_group(uuid) from public;
grant execute on function app.student_in_group(uuid) to authenticated;

-- Same gap one level up: `groups_select` covered admins, examiners, teachers
-- and parents but not students, so every `groups(name)` sub-select made on a
-- student's behalf came back empty — the group name was blank on their
-- attendance and homework lists rather than missing-looking enough to notice.
drop policy if exists "groups_select" on public.groups;
create policy "groups_select"
  on public.groups
  for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin'::app.app_role)
    or app.is_platform_owner()
    or app.current_examiner_profile_id(mosque_id) is not null
    or exists (
      select 1
      from public.teacher_group_links tgl
      where tgl.group_id = groups.id
        and tgl.is_active
        and tgl.teacher_profile_id in (
          select app.current_teacher_profile_ids(groups.mosque_id)
        )
    )
    or exists (
      select 1
      from public.group_enrollments ge
      join public.parent_student_links psl
        on psl.student_profile_id = ge.student_profile_id
      where ge.group_id = groups.id
        and ge.is_active
        and psl.parent_profile_id in (
          select app.current_parent_profile_ids(groups.mosque_id)
        )
    )
    or app.student_in_group(groups.id)
  );

drop policy if exists "attendance_sessions_select" on public.attendance_sessions;
create policy "attendance_sessions_select"
  on public.attendance_sessions
  for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin'::app.app_role)
    or app.is_teacher_of_group(group_id)
    or app.parent_has_group(group_id)
    or app.student_in_group(group_id)
  );
