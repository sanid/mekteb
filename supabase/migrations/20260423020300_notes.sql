-- Phase 2: notes.
-- progress_notes: per-student observations (from a teacher).
-- teacher_weekly_notes: per-group weekly summary for parents to read.

create table public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  author_profile_id uuid references public.profiles(id) on delete set null,
  body text not null,
  visible_to_parents boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index progress_notes_student_idx on public.progress_notes (student_profile_id);
create index progress_notes_mosque_student_idx
  on public.progress_notes (mosque_id, student_profile_id, created_at desc);

create trigger set_updated_at
before update on public.progress_notes
for each row execute function app.set_updated_at();

create or replace function app.check_progress_note_mosque()
returns trigger
language plpgsql
as $$
declare
  student_mosque uuid;
  group_mosque uuid;
begin
  select mosque_id into student_mosque from public.student_profiles where id = new.student_profile_id;
  if student_mosque is distinct from new.mosque_id then
    raise exception 'progress_notes: student must belong to same mosque';
  end if;
  if new.group_id is not null then
    select mosque_id into group_mosque from public.groups where id = new.group_id;
    if group_mosque is distinct from new.mosque_id then
      raise exception 'progress_notes: group must belong to same mosque';
    end if;
  end if;
  return new;
end;
$$;

create trigger progress_notes_mosque_check
before insert or update on public.progress_notes
for each row execute function app.check_progress_note_mosque();

create table public.teacher_weekly_notes (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  week_start date not null,
  body text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (group_id, week_start)
);

create index teacher_weekly_notes_mosque_group_idx
  on public.teacher_weekly_notes (mosque_id, group_id, week_start desc);

create trigger set_updated_at
before update on public.teacher_weekly_notes
for each row execute function app.set_updated_at();

create or replace function app.check_weekly_note_mosque()
returns trigger
language plpgsql
as $$
declare
  group_mosque uuid;
begin
  select mosque_id into group_mosque from public.groups where id = new.group_id;
  if group_mosque is distinct from new.mosque_id then
    raise exception 'teacher_weekly_notes: group must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger teacher_weekly_notes_mosque_check
before insert or update on public.teacher_weekly_notes
for each row execute function app.check_weekly_note_mosque();
