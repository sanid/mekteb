-- Phase 1: groups, enrollments, teacher assignments.

-- A class/cohort inside a mosque. Attendance sessions, homework, and
-- progress notes in later phases are all scoped to a group.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (mosque_id, name)
);

create index groups_mosque_id_idx on public.groups (mosque_id);

create trigger set_updated_at
before update on public.groups
for each row execute function app.set_updated_at();

-- Student membership in a group. One student can move between groups over
-- time; active enrollment is what drives visibility for teachers.
create table public.group_enrollments (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  enrolled_at date not null default current_date,
  ended_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (group_id, student_profile_id, enrolled_at)
);

create index group_enrollments_mosque_id_idx on public.group_enrollments (mosque_id);
create index group_enrollments_group_id_idx on public.group_enrollments (group_id);
create index group_enrollments_student_id_idx on public.group_enrollments (student_profile_id);
create index group_enrollments_mosque_group_idx
  on public.group_enrollments (mosque_id, group_id);

create trigger set_updated_at
before update on public.group_enrollments
for each row execute function app.set_updated_at();

-- Ensure group + student belong to same mosque as the link row.
create or replace function app.check_group_enrollment_mosque()
returns trigger
language plpgsql
as $$
declare
  group_mosque uuid;
  student_mosque uuid;
begin
  select mosque_id into group_mosque from public.groups where id = new.group_id;
  select mosque_id into student_mosque from public.student_profiles where id = new.student_profile_id;
  if group_mosque is distinct from new.mosque_id or student_mosque is distinct from new.mosque_id then
    raise exception 'group_enrollments: mosque_id must match both group and student mosques';
  end if;
  return new;
end;
$$;

create trigger group_enrollments_mosque_check
before insert or update on public.group_enrollments
for each row execute function app.check_group_enrollment_mosque();

-- Teacher assignment to a group. A teacher can be assigned to many groups;
-- a group can have many teachers (co-teachers / substitutes).
create table public.teacher_group_links (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  teacher_profile_id uuid not null references public.teacher_profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (teacher_profile_id, group_id)
);

create index teacher_group_links_mosque_id_idx on public.teacher_group_links (mosque_id);
create index teacher_group_links_teacher_idx on public.teacher_group_links (teacher_profile_id);
create index teacher_group_links_group_idx on public.teacher_group_links (group_id);
create index teacher_group_links_mosque_group_idx
  on public.teacher_group_links (mosque_id, group_id);

create trigger set_updated_at
before update on public.teacher_group_links
for each row execute function app.set_updated_at();

create or replace function app.check_teacher_group_link_mosque()
returns trigger
language plpgsql
as $$
declare
  teacher_mosque uuid;
  group_mosque uuid;
begin
  select mosque_id into teacher_mosque from public.teacher_profiles where id = new.teacher_profile_id;
  select mosque_id into group_mosque from public.groups where id = new.group_id;
  if teacher_mosque is distinct from new.mosque_id or group_mosque is distinct from new.mosque_id then
    raise exception 'teacher_group_links: mosque_id must match both teacher and group mosques';
  end if;
  return new;
end;
$$;

create trigger teacher_group_links_mosque_check
before insert or update on public.teacher_group_links
for each row execute function app.check_teacher_group_link_mosque();
