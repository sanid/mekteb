-- Teachers can read the contact details of parents whose children they teach.
--
-- The teacher group page has always queried
-- `parent_student_links → parent_profiles(id, profiles(full_name, phone))`,
-- but three policies silently returned nothing for a teacher:
--
--   * `parent_student_links_select` — admin / platform owner / the parent
--     themselves only;
--   * `parent_profiles_select` — admin / platform owner / self only;
--   * `profiles` RLS — self (or admin) only.
--
-- So the "parents" tab listed no rows at all, and even the rows that leaked
-- through elsewhere joined to NULL names and phones. This migration adds the
-- missing teacher branch to all three: a teacher may read the link, the
-- parent profile and the parent's profile row for any parent linked to a
-- student enrolled in one of their groups.
--
-- Deliberately scoped: the teacher must be linked (active) to the group, and
-- the student enrolment must be active. A teacher sees only the parents of
-- the students they actually teach, in their own mosque. Read-only: none of
-- the write policies are touched.
--
-- The teacher check lives in a security-definer helper (`app.teacher_has_parent`)
-- because inlining the joins into the policies recurses: `group_enrollments_select`
-- queries `parent_student_links` (parent branch), so a `parent_student_links`
-- policy that queries `group_enrollments` forms a cycle. The helper bypasses
-- RLS, exactly like `app.current_teacher_profile_ids` and friends.

create or replace function app.teacher_has_parent(target_parent_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.parent_student_links psl
    join public.group_enrollments ge
      on ge.student_profile_id = psl.student_profile_id and ge.is_active
    join public.teacher_group_links tgl
      on tgl.group_id = ge.group_id and tgl.is_active
    where psl.parent_profile_id = target_parent_profile
      and tgl.teacher_profile_id in (select app.current_teacher_profile_ids(psl.mosque_id))
  )
$$;

revoke all on function app.teacher_has_parent(uuid) from public;
grant execute on function app.teacher_has_parent(uuid) to authenticated;

-- ── parent_student_links: teacher branch ───────────────────────────────────

drop policy if exists parent_student_links_select on public.parent_student_links;

create policy parent_student_links_select
  on public.parent_student_links for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or parent_profile_id in (select app.current_parent_profile_ids(mosque_id))
    or app.teacher_has_parent(parent_profile_id)
  );

-- ── parent_profiles: teacher branch ────────────────────────────────────────

drop policy if exists parent_profiles_select on public.parent_profiles;

create policy parent_profiles_select
  on public.parent_profiles for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or profile_id = auth.uid()
    or app.teacher_has_parent(id)
  );

-- ── profiles: teacher branch for parents of their students ─────────────────

drop policy if exists profiles_teacher_parent_select on public.profiles;

create policy profiles_teacher_parent_select
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.parent_profiles pp
      where pp.profile_id = profiles.id
        and app.teacher_has_parent(pp.id)
    )
  );

comment on policy parent_student_links_select on public.parent_student_links is
  'Admins, the linked parents, and teachers of the student''s active groups.';
comment on policy parent_profiles_select on public.parent_profiles is
  'Admins, the parent themselves, and teachers of their children''s active groups.';
comment on policy profiles_teacher_parent_select on public.profiles is
  'Teachers read the profiles of parents linked to students in their active groups, so parent contacts show up in the teacher portal.';
