-- Student portal RLS.
-- Students authenticate via student_profiles.profile_id = auth.uid().
-- They do NOT have rows in the memberships table.
-- This migration adds a helper + extends existing policies so students can
-- read their own groups, enrollments, homework, attendance, and notes.

-- ---------------------------------------------------------------------------
-- Helper: caller is an active student at the given mosque
-- ---------------------------------------------------------------------------

create or replace function app.is_student(target_mosque uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.student_profiles sp
    where sp.profile_id = auth.uid()
      and sp.mosque_id = target_mosque
      and sp.is_active
  )
$$;

revoke all on function app.is_student(uuid) from public;
grant execute on function app.is_student(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- group_enrollments: add student self-read
-- ---------------------------------------------------------------------------

drop policy if exists group_enrollments_select on public.group_enrollments;
create policy group_enrollments_select
  on public.group_enrollments for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or exists (
      select 1 from public.teacher_group_links tgl
      where tgl.group_id = group_enrollments.group_id and tgl.is_active
        and tgl.teacher_profile_id in (select app.current_teacher_profile_ids(group_enrollments.mosque_id))
    )
    or exists (
      select 1 from public.parent_student_links psl
      where psl.student_profile_id = group_enrollments.student_profile_id
        and psl.parent_profile_id in (select app.current_parent_profile_ids(group_enrollments.mosque_id))
    )
    or exists (
      select 1 from public.student_profiles sp
      where sp.id = group_enrollments.student_profile_id
        and sp.profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- groups: add student self-read (enrolled groups)
-- ---------------------------------------------------------------------------

drop policy if exists groups_select on public.groups;
create policy groups_select
  on public.groups for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or exists (
      select 1 from public.teacher_group_links tgl
      where tgl.group_id = groups.id and tgl.is_active
        and tgl.teacher_profile_id in (select app.current_teacher_profile_ids(groups.mosque_id))
    )
    or exists (
      select 1
      from public.group_enrollments ge
      join public.parent_student_links psl
        on psl.student_profile_id = ge.student_profile_id
      where ge.group_id = groups.id and ge.is_active
        and psl.parent_profile_id in (select app.current_parent_profile_ids(groups.mosque_id))
    )
    or exists (
      select 1
      from public.group_enrollments ge
      join public.student_profiles sp on sp.id = ge.student_profile_id
      where ge.group_id = groups.id
        and ge.is_active
        and sp.profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- homework_assignments: extend to include student self-read for group audience
-- ---------------------------------------------------------------------------

drop policy if exists homework_assignments_select on public.homework_assignments;
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
      and (
        app.parent_has_group(group_id)
        or exists (
          select 1
          from public.group_enrollments ge
          join public.student_profiles sp on sp.id = ge.student_profile_id
          where ge.group_id = homework_assignments.group_id
            and ge.is_active
            and sp.profile_id = auth.uid()
        )
      )
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

-- ---------------------------------------------------------------------------
-- announcements: add student read
-- ---------------------------------------------------------------------------

drop policy if exists announcements_select on public.announcements;
create policy announcements_select
  on public.announcements for select
  to authenticated
  using (
    is_published = true
    and (
      app.is_member(mosque_id)
      or app.is_student(mosque_id)
    )
  );

-- ---------------------------------------------------------------------------
-- teacher_weekly_notes: students enrolled in the group can read published notes
-- ---------------------------------------------------------------------------

drop policy if exists teacher_weekly_notes_select on public.teacher_weekly_notes;
create policy teacher_weekly_notes_select
  on public.teacher_weekly_notes for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
    or (is_published and app.parent_has_group(group_id))
    or (
      is_published
      and exists (
        select 1
        from public.group_enrollments ge
        join public.student_profiles sp on sp.id = ge.student_profile_id
        where ge.group_id = teacher_weekly_notes.group_id
          and ge.is_active
          and sp.profile_id = auth.uid()
      )
    )
  );
