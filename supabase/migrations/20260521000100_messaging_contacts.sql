-- Returns the messaging contacts the calling user should see.
--
-- Rules:
--   - Mosque admins always appear (so parents/teachers can ask questions).
--   - For a parent: also their children's assigned teachers.
--   - For a teacher: also the parents of students in their assigned groups,
--     plus other teachers in the mosque (peer collaboration).
--   - For an admin: every active admin/teacher/parent in their mosque.
--
-- The function is SECURITY DEFINER so it can read across memberships without
-- relying on RLS, which scopes non-admins to their own row only.

create or replace function app.messaging_contacts(p_mosque_id uuid)
returns table (
  profile_id uuid,
  role text,
  name text
)
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_teacher boolean;
  v_is_parent boolean;
  v_teacher_profile_id uuid;
  v_parent_profile_id uuid;
begin
  if v_uid is null then
    return;
  end if;

  -- Caller must be a member of this mosque (admins bypass via has_role check).
  if not exists (
    select 1 from public.memberships m
    where m.user_id = v_uid
      and m.mosque_id = p_mosque_id
      and m.is_active
  ) then
    return;
  end if;

  select bool_or(m.role = 'mosque_admin'),
         bool_or(m.role = 'teacher'),
         bool_or(m.role = 'parent')
    into v_is_admin, v_is_teacher, v_is_parent
  from public.memberships m
  where m.user_id = v_uid
    and m.mosque_id = p_mosque_id
    and m.is_active;

  -- Admins see everyone in their mosque.
  if v_is_admin then
    return query
    select p.id as profile_id,
           m.role::text as role,
           coalesce(p.display_name, p.full_name, '') as name
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    where m.mosque_id = p_mosque_id
      and m.is_active
      and m.user_id <> v_uid
      and m.role in ('mosque_admin', 'teacher', 'parent');
    return;
  end if;

  -- Everyone else: admins are always included.
  return query
  select p.id as profile_id,
         'mosque_admin'::text as role,
         coalesce(p.display_name, p.full_name, '') as name
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.mosque_id = p_mosque_id
    and m.is_active
    and m.role = 'mosque_admin'
    and m.user_id <> v_uid;

  if v_is_teacher then
    select tp.id into v_teacher_profile_id
    from public.teacher_profiles tp
    where tp.profile_id = v_uid
      and tp.mosque_id = p_mosque_id
      and tp.is_active
    limit 1;

    if v_teacher_profile_id is not null then
      -- Parents of students enrolled in this teacher's groups.
      return query
      select distinct pp.profile_id,
             'parent'::text as role,
             coalesce(p.display_name, p.full_name, '') as name
      from public.teacher_group_links tgl
      join public.group_enrollments ge
        on ge.group_id = tgl.group_id and ge.is_active
      join public.parent_student_links psl
        on psl.student_profile_id = ge.student_profile_id
      join public.parent_profiles pp on pp.id = psl.parent_profile_id and pp.is_active
      join public.profiles p on p.id = pp.profile_id
      where tgl.teacher_profile_id = v_teacher_profile_id
        and tgl.is_active
        and pp.profile_id <> v_uid;
    end if;

    -- Peer teachers in the same mosque.
    return query
    select p.id as profile_id,
           'teacher'::text as role,
           coalesce(p.display_name, p.full_name, '') as name
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    where m.mosque_id = p_mosque_id
      and m.is_active
      and m.role = 'teacher'
      and m.user_id <> v_uid;
  end if;

  if v_is_parent then
    select pp.id into v_parent_profile_id
    from public.parent_profiles pp
    where pp.profile_id = v_uid
      and pp.mosque_id = p_mosque_id
      and pp.is_active
    limit 1;

    if v_parent_profile_id is not null then
      -- Teachers assigned to groups my children are enrolled in.
      return query
      select distinct tp.profile_id,
             'teacher'::text as role,
             coalesce(p.display_name, p.full_name, '') as name
      from public.parent_student_links psl
      join public.group_enrollments ge
        on ge.student_profile_id = psl.student_profile_id and ge.is_active
      join public.teacher_group_links tgl
        on tgl.group_id = ge.group_id and tgl.is_active
      join public.teacher_profiles tp on tp.id = tgl.teacher_profile_id and tp.is_active
      join public.profiles p on p.id = tp.profile_id
      where psl.parent_profile_id = v_parent_profile_id
        and tp.profile_id <> v_uid;
    end if;
  end if;
end;
$$;

revoke all on function app.messaging_contacts(uuid) from public;
grant execute on function app.messaging_contacts(uuid) to authenticated;

-- Public wrapper so PostgREST (which only exposes the public schema) can
-- reach the function via supabase.rpc('messaging_contacts').
create or replace function public.messaging_contacts(p_mosque_id uuid)
returns table (
  profile_id uuid,
  role text,
  name text
)
language sql
security definer
set search_path = public, app
as $$
  select * from app.messaging_contacts(p_mosque_id);
$$;

revoke all on function public.messaging_contacts(uuid) from public;
grant execute on function public.messaging_contacts(uuid) to authenticated;
