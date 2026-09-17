-- Phase 2: attendance.
-- One attendance_sessions row per (group, date). Each enrolled student has
-- a matching attendance_records row with a status and optional note.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type app.attendance_status as enum ('present', 'absent', 'late', 'excused');
  end if;
end $$;

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  session_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (group_id, session_date)
);

create index attendance_sessions_mosque_group_date_idx
  on public.attendance_sessions (mosque_id, group_id, session_date desc);

create trigger set_updated_at
before update on public.attendance_sessions
for each row execute function app.set_updated_at();

create or replace function app.check_attendance_session_mosque()
returns trigger
language plpgsql
as $$
declare
  group_mosque uuid;
begin
  select mosque_id into group_mosque from public.groups where id = new.group_id;
  if group_mosque is distinct from new.mosque_id then
    raise exception 'attendance_sessions: group must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger attendance_sessions_mosque_check
before insert or update on public.attendance_sessions
for each row execute function app.check_attendance_session_mosque();

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  status app.attendance_status not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (session_id, student_profile_id)
);

create index attendance_records_mosque_id_idx on public.attendance_records (mosque_id);
create index attendance_records_session_idx on public.attendance_records (session_id);
create index attendance_records_student_idx on public.attendance_records (student_profile_id);

create trigger set_updated_at
before update on public.attendance_records
for each row execute function app.set_updated_at();

create or replace function app.check_attendance_record_integrity()
returns trigger
language plpgsql
as $$
declare
  session_mosque uuid;
  student_mosque uuid;
begin
  select mosque_id into session_mosque from public.attendance_sessions where id = new.session_id;
  select mosque_id into student_mosque from public.student_profiles where id = new.student_profile_id;
  if session_mosque is distinct from new.mosque_id or student_mosque is distinct from new.mosque_id then
    raise exception 'attendance_records: session and student must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger attendance_records_integrity_check
before insert or update on public.attendance_records
for each row execute function app.check_attendance_record_integrity();
