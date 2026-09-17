-- Examiners need to read the list of groups in their mosque so the
-- "promote to group" picker on the exam workflow has options to show.
-- The original groups_select policy in 20260423010200_people_groups_rls.sql
-- only covers admins / teachers-of-group / parents-of-enrolled.

drop policy if exists groups_select on public.groups;

create policy groups_select
  on public.groups for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or app.current_examiner_profile_id(mosque_id) is not null
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
  );
