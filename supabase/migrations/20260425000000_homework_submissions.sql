-- Phase 5: homework acknowledgment.
--
-- Parents acknowledge homework on behalf of their child. Teachers can see
-- the acknowledgment status per homework.
--
-- Design:
--   * One row per (homework, student) pair — upserted by the parent.
--   * Mosque invariant trigger keeps cross-mosque submissions impossible.
--   * RLS: admins all, teachers read-only for their groups' homework,
--     parents read+upsert for their linked children.

create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  homework_id uuid not null references public.homework_assignments(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (homework_id, student_profile_id)
);

create index homework_submissions_mosque_idx
  on public.homework_submissions (mosque_id);
create index homework_submissions_homework_idx
  on public.homework_submissions (homework_id);
create index homework_submissions_student_idx
  on public.homework_submissions (student_profile_id);

create trigger set_updated_at
before update on public.homework_submissions
for each row execute function app.set_updated_at();

-- Mosque invariant: homework and student must be in same mosque.
create or replace function app.check_submission_mosque()
returns trigger
language plpgsql
as $$
declare
  hw_mosque uuid;
  st_mosque uuid;
begin
  select mosque_id into hw_mosque
  from public.homework_assignments where id = new.homework_id;

  if hw_mosque is distinct from new.mosque_id then
    raise exception 'homework_submissions: homework must belong to same mosque';
  end if;

  select mosque_id into st_mosque
  from public.student_profiles where id = new.student_profile_id;

  if st_mosque is distinct from new.mosque_id then
    raise exception 'homework_submissions: student must belong to same mosque';
  end if;

  return new;
end;
$$;

create trigger homework_submissions_mosque_check
before insert or update on public.homework_submissions
for each row execute function app.check_submission_mosque();

-- RLS
alter table public.homework_submissions enable row level security;

-- Admins: full access within mosque.
create policy homework_submissions_admin
  on public.homework_submissions for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'mosque_admin'));

-- Teachers: read submissions for homework in their groups.
create policy homework_submissions_teacher_select
  on public.homework_submissions for select
  to authenticated
  using (app.teacher_has_homework(homework_id));

-- Parents: read submissions for their linked children.
create policy homework_submissions_parent_select
  on public.homework_submissions for select
  to authenticated
  using (app.parent_has_student(student_profile_id));

-- Parents: insert acknowledgment for their linked children.
create policy homework_submissions_parent_insert
  on public.homework_submissions for insert
  to authenticated
  with check (app.parent_has_student(student_profile_id));

-- Parents: update their own acknowledgments.
create policy homework_submissions_parent_update
  on public.homework_submissions for update
  to authenticated
  using (app.parent_has_student(student_profile_id))
  with check (app.parent_has_student(student_profile_id));
