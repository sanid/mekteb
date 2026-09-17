-- Phase 1: people.
-- Domain-level profile tables for teachers, parents, and students. These
-- hang off a public.profiles row when the person is also an auth user
-- (teachers, parents). Students can exist without an auth.users row — many
-- children won't have logins in the MVP.

-- ---------------------------------------------------------------------------
-- teacher_profiles
-- ---------------------------------------------------------------------------

create table public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (mosque_id, profile_id)
);

create index teacher_profiles_mosque_id_idx on public.teacher_profiles (mosque_id);
create index teacher_profiles_profile_id_idx on public.teacher_profiles (profile_id);

create trigger set_updated_at
before update on public.teacher_profiles
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- parent_profiles
-- ---------------------------------------------------------------------------

create table public.parent_profiles (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  relation text, -- e.g. mother, father, guardian; free text in MVP
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (mosque_id, profile_id)
);

create index parent_profiles_mosque_id_idx on public.parent_profiles (mosque_id);
create index parent_profiles_profile_id_idx on public.parent_profiles (profile_id);

create trigger set_updated_at
before update on public.parent_profiles
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- student_profiles
-- ---------------------------------------------------------------------------
-- profile_id is optional: most students won't have their own login in MVP.
-- When they do (Phase 5+), the profile_id is set and RLS can grant read
-- access to their own records.

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  date_of_birth date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index student_profiles_mosque_id_idx on public.student_profiles (mosque_id);
create index student_profiles_profile_id_idx on public.student_profiles (profile_id);

create trigger set_updated_at
before update on public.student_profiles
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- parent_student_links
-- ---------------------------------------------------------------------------
-- Many-to-many: a parent can have multiple students; a student can have
-- multiple guardians. mosque_id is denormalized onto the link for RLS speed
-- and is kept consistent with its endpoints by a check trigger below.

create table public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  parent_profile_id uuid not null references public.parent_profiles(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (parent_profile_id, student_profile_id)
);

create index parent_student_links_mosque_id_idx
  on public.parent_student_links (mosque_id);
create index parent_student_links_parent_idx
  on public.parent_student_links (parent_profile_id);
create index parent_student_links_student_idx
  on public.parent_student_links (student_profile_id);

create trigger set_updated_at
before update on public.parent_student_links
for each row execute function app.set_updated_at();

-- Guarantee all three rows belong to the same mosque. RLS assumes this
-- invariant when using the denormalized mosque_id column on the link.
create or replace function app.check_parent_student_link_mosque()
returns trigger
language plpgsql
as $$
declare
  parent_mosque uuid;
  student_mosque uuid;
begin
  select mosque_id into parent_mosque from public.parent_profiles where id = new.parent_profile_id;
  select mosque_id into student_mosque from public.student_profiles where id = new.student_profile_id;
  if parent_mosque is distinct from new.mosque_id or student_mosque is distinct from new.mosque_id then
    raise exception 'parent_student_links: mosque_id must match both parent and student mosques';
  end if;
  return new;
end;
$$;

create trigger parent_student_links_mosque_check
before insert or update on public.parent_student_links
for each row execute function app.check_parent_student_link_mosque();
