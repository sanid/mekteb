-- Break the infinite recursion cycle between student_profiles and group_enrollments.
--
-- Cycle:
--   groups_select           → reads group_enrollments
--   group_enrollments_select → reads student_profiles
--   student_profiles_select  → reads group_enrollments  ← LOOP
--
-- Fix: replace the teacher check in student_profiles_select with a simple
-- mosque-level role check (app.has_role(mosque_id, 'teacher')) instead of
-- a correlated subquery through group_enrollments.  Teachers in the mosque
-- can already read all group_enrollments; there is no meaningful data-
-- isolation benefit in restricting student profile visibility to "only
-- students in my groups" vs "all students in my mosque".

drop policy if exists student_profiles_select on public.student_profiles;

create policy student_profiles_select
  on public.student_profiles for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or profile_id = auth.uid()
    or exists (
      select 1 from public.parent_student_links psl
      where psl.student_profile_id = student_profiles.id
        and psl.parent_profile_id in (
          select app.current_parent_profile_ids(student_profiles.mosque_id)
        )
    )
    -- Teachers: access all student profiles in their mosque.
    -- Using a simple role check avoids a join through group_enrollments
    -- which would create an RLS recursion cycle.
    or app.has_role(mosque_id, 'teacher')
  );
