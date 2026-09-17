-- Allow mosque admins to read profiles of users who share a membership in
-- the same mosque.  This unblocks the JOINs from teacher_profiles /
-- parent_profiles → profiles that the admin dashboard relies on.

create policy profiles_mosque_admin_select
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = profiles.id
        and m.mosque_id in (
          select m2.mosque_id
          from public.memberships m2
          where m2.user_id = auth.uid()
            and m2.role = 'mosque_admin'
            and m2.is_active
        )
    )
  );
