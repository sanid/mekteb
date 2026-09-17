-- Phase 2: homework.
--
-- Requirements:
--   * Homework belongs to a group (the class context).
--   * A teacher can optionally attach a lesson OR write a free-form
--     title/body with no lesson link.
--   * Audience is either the whole group, or a specific list of students in
--     that group.
--
-- Modeling:
--   * `homework_assignments.audience` is an enum ('group' | 'individual').
--   * When audience='group', no homework_targets rows exist — every active
--     enrollee in the group sees it.
--   * When audience='individual', one homework_targets row per student.
--   * lesson_id is nullable; title is required so there is always something
--     to display even without a lesson.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'homework_audience') then
    create type app.homework_audience as enum ('group', 'individual');
  end if;
end $$;

create table public.homework_assignments (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  body text,
  due_date date,
  audience app.homework_audience not null default 'group',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index homework_assignments_mosque_group_idx
  on public.homework_assignments (mosque_id, group_id);
create index homework_assignments_due_date_idx
  on public.homework_assignments (due_date);
create index homework_assignments_lesson_id_idx
  on public.homework_assignments (lesson_id);

create trigger set_updated_at
before update on public.homework_assignments
for each row execute function app.set_updated_at();

-- Group + (optional) lesson must share the same mosque as the homework.
create or replace function app.check_homework_mosque()
returns trigger
language plpgsql
as $$
declare
  group_mosque uuid;
  lesson_mosque uuid;
begin
  select mosque_id into group_mosque from public.groups where id = new.group_id;
  if group_mosque is distinct from new.mosque_id then
    raise exception 'homework_assignments: group must belong to same mosque';
  end if;
  if new.lesson_id is not null then
    select mosque_id into lesson_mosque from public.lessons where id = new.lesson_id;
    if lesson_mosque is distinct from new.mosque_id then
      raise exception 'homework_assignments: lesson must belong to same mosque';
    end if;
  end if;
  return new;
end;
$$;

create trigger homework_assignments_mosque_check
before insert or update on public.homework_assignments
for each row execute function app.check_homework_mosque();

-- Targets for individual-audience homework. One row per targeted student.
create table public.homework_targets (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  homework_id uuid not null references public.homework_assignments(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (homework_id, student_profile_id)
);

create index homework_targets_mosque_id_idx on public.homework_targets (mosque_id);
create index homework_targets_homework_idx on public.homework_targets (homework_id);
create index homework_targets_student_idx on public.homework_targets (student_profile_id);

create trigger set_updated_at
before update on public.homework_targets
for each row execute function app.set_updated_at();

-- The homework, student, and the link must all share the same mosque; and
-- the targeted student must be currently enrolled in the homework's group.
create or replace function app.check_homework_target_integrity()
returns trigger
language plpgsql
as $$
declare
  hw record;
  student_mosque uuid;
  is_enrolled boolean;
begin
  select mosque_id, group_id, audience into hw
  from public.homework_assignments where id = new.homework_id;

  if hw.mosque_id is distinct from new.mosque_id then
    raise exception 'homework_targets: homework must belong to same mosque';
  end if;

  if hw.audience <> 'individual' then
    raise exception 'homework_targets: only allowed when audience=individual';
  end if;

  select mosque_id into student_mosque from public.student_profiles where id = new.student_profile_id;
  if student_mosque is distinct from new.mosque_id then
    raise exception 'homework_targets: student must belong to same mosque';
  end if;

  select exists (
    select 1 from public.group_enrollments
    where group_id = hw.group_id
      and student_profile_id = new.student_profile_id
      and is_active
  ) into is_enrolled;
  if not is_enrolled then
    raise exception 'homework_targets: student must be enrolled in the homework group';
  end if;

  return new;
end;
$$;

create trigger homework_targets_integrity_check
before insert or update on public.homework_targets
for each row execute function app.check_homework_target_integrity();
