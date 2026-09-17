-- Fix: infinite recursion between homework_assignments_select and
-- homework_targets_select RLS policies.
--
-- The cycle: homework_assignments_select contained an EXISTS subquery that
-- read homework_targets (which has RLS), and homework_targets_select
-- contained an EXISTS subquery that read homework_assignments (which has
-- RLS). PostgreSQL's RLS evaluator follows both subqueries and loops.
--
-- Fix: break the cycle with security-definer helper functions. Inside a
-- SECURITY DEFINER function the calling user's RLS does NOT apply, so the
-- subquery reads the base table directly and the cycle is broken.

-- ---------------------------------------------------------------------------
-- New helpers
-- ---------------------------------------------------------------------------

-- True if the calling user (as a parent) is linked to at least one student
-- who is targeted by the given individual-audience homework.
create or replace function app.parent_has_individual_homework(p_homework_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.homework_targets ht
    join public.parent_student_links psl
      on psl.student_profile_id = ht.student_profile_id
    join public.parent_profiles pp
      on pp.id = psl.parent_profile_id
      and pp.is_active
    where ht.homework_id = p_homework_id
      and pp.profile_id = auth.uid()
  );
$$;

-- True if the calling user (as a student) is targeted by the given homework.
create or replace function app.student_has_homework(p_homework_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.homework_targets ht
    join public.student_profiles sp on sp.id = ht.student_profile_id
    where ht.homework_id = p_homework_id
      and sp.profile_id = auth.uid()
  );
$$;

-- True if the calling user (as a teacher) is assigned to the group that
-- owns the given homework.
create or replace function app.teacher_has_homework(p_homework_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.homework_assignments h
    join public.teacher_group_links tgl
      on tgl.group_id = h.group_id
      and tgl.is_active
    join public.teacher_profiles tp
      on tp.id = tgl.teacher_profile_id
      and tp.is_active
    where h.id = p_homework_id
      and tp.profile_id = auth.uid()
  );
$$;

revoke all on function app.parent_has_individual_homework(uuid) from public;
revoke all on function app.student_has_homework(uuid) from public;
revoke all on function app.teacher_has_homework(uuid) from public;
grant execute on function app.parent_has_individual_homework(uuid) to authenticated;
grant execute on function app.student_has_homework(uuid) to authenticated;
grant execute on function app.teacher_has_homework(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Recreate homework_assignments_select
-- Replaces the EXISTS-on-homework_targets with calls to security-definer
-- functions that bypass RLS when accessing homework_targets.
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
      and app.parent_has_group(group_id)
    )
    or (
      is_published
      and audience = 'individual'
      and app.parent_has_individual_homework(id)
    )
    or (
      is_published
      and audience = 'individual'
      and app.student_has_homework(id)
    )
  );

-- ---------------------------------------------------------------------------
-- Recreate homework_targets_select
-- Replaces the EXISTS-on-homework_assignments with app.teacher_has_homework.
-- ---------------------------------------------------------------------------

drop policy if exists homework_targets_select on public.homework_targets;

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
    or app.teacher_has_homework(homework_id)
  );
