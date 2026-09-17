-- Phase 1: RLS for people + groups.
-- Patterns used:
--   * Mosque admins: full access within their mosque.
--   * Teachers: read the roster of groups they are assigned to; read their
--     own teacher_profile. Write access to enrollments/attendance comes in
--     later phases.
--   * Parents: read their own parent_profile; read students linked to them
--     via parent_student_links; read groups their children are enrolled in.
--   * Writes for all join/link tables go through server-side code for now
--     (admin UI uses the service role). We expose SELECT to the right
--     audiences and defer INSERT/UPDATE/DELETE policies.

-- ---------------------------------------------------------------------------
-- Helpers specific to phase 1
-- ---------------------------------------------------------------------------

-- Returns the teacher_profiles.id rows owned by the current auth user.
create or replace function app.current_teacher_profile_ids(target_mosque uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, app
as $$
  select tp.id
  from public.teacher_profiles tp
  where tp.profile_id = auth.uid()
    and tp.mosque_id = target_mosque
    and tp.is_active;
$$;

create or replace function app.current_parent_profile_ids(target_mosque uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, app
as $$
  select pp.id
  from public.parent_profiles pp
  where pp.profile_id = auth.uid()
    and pp.mosque_id = target_mosque
    and pp.is_active;
$$;

revoke all on function app.current_teacher_profile_ids(uuid) from public;
revoke all on function app.current_parent_profile_ids(uuid) from public;
grant execute on function app.current_teacher_profile_ids(uuid) to authenticated;
grant execute on function app.current_parent_profile_ids(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.teacher_profiles     enable row level security;
alter table public.parent_profiles      enable row level security;
alter table public.student_profiles     enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.groups               enable row level security;
alter table public.group_enrollments    enable row level security;
alter table public.teacher_group_links  enable row level security;

-- ---------------------------------------------------------------------------
-- teacher_profiles
-- ---------------------------------------------------------------------------

-- Admins read all teachers in the mosque; teachers read their own row.
create policy teacher_profiles_select
  on public.teacher_profiles for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or profile_id = auth.uid()
  );

create policy teacher_profiles_admin_write
  on public.teacher_profiles for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- ---------------------------------------------------------------------------
-- parent_profiles
-- ---------------------------------------------------------------------------

create policy parent_profiles_select
  on public.parent_profiles for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or profile_id = auth.uid()
  );

create policy parent_profiles_admin_write
  on public.parent_profiles for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- ---------------------------------------------------------------------------
-- student_profiles
-- ---------------------------------------------------------------------------
-- Visibility:
--   * admins in the mosque
--   * teachers assigned to a group the student is enrolled in
--   * parents linked to this student
--   * the student themselves (if they have a profile_id)

create policy student_profiles_select
  on public.student_profiles for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or profile_id = auth.uid()
    or exists (
      select 1
      from public.parent_student_links psl
      where psl.student_profile_id = student_profiles.id
        and psl.parent_profile_id in (select app.current_parent_profile_ids(student_profiles.mosque_id))
    )
    or exists (
      select 1
      from public.group_enrollments ge
      join public.teacher_group_links tgl
        on tgl.group_id = ge.group_id and tgl.is_active
      where ge.student_profile_id = student_profiles.id
        and ge.is_active
        and tgl.teacher_profile_id in (select app.current_teacher_profile_ids(student_profiles.mosque_id))
    )
  );

create policy student_profiles_admin_write
  on public.student_profiles for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- ---------------------------------------------------------------------------
-- parent_student_links
-- ---------------------------------------------------------------------------

create policy parent_student_links_select
  on public.parent_student_links for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or parent_profile_id in (select app.current_parent_profile_ids(mosque_id))
  );

create policy parent_student_links_admin_write
  on public.parent_student_links for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
-- Admins: full access. Teachers: read groups they are assigned to. Parents:
-- read groups where at least one of their children is enrolled.

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
  );

create policy groups_admin_write
  on public.groups for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- ---------------------------------------------------------------------------
-- group_enrollments
-- ---------------------------------------------------------------------------

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
  );

create policy group_enrollments_admin_write
  on public.group_enrollments for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- ---------------------------------------------------------------------------
-- teacher_group_links
-- ---------------------------------------------------------------------------

create policy teacher_group_links_select
  on public.teacher_group_links for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or teacher_profile_id in (select app.current_teacher_profile_ids(mosque_id))
  );

create policy teacher_group_links_admin_write
  on public.teacher_group_links for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());
