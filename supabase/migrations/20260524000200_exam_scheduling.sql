-- Exam scheduling: oral/written split, parent/student proposal flow, retakes.
--
-- Adds proposal/confirmation workflow on exam_sessions and helpers so parents
-- and students can see (and respond to) sessions for their child / themselves.

-- ---------------------------------------------------------------------------
-- 1. Extend exam_sessions columns
-- ---------------------------------------------------------------------------

alter table public.exam_sessions
  add column oral_required    boolean not null default true,
  add column oral_passed      boolean,
  add column written_required boolean not null default true,
  add column written_passed   boolean,
  add column proposed_date    date,
  add column proposed_by      text check (proposed_by in ('examiner','parent','student')),
  add column schedule_status  text not null default 'proposed'
    check (schedule_status in ('proposed','confirmed','counter_proposed')),
  add column retake_of_session_id uuid references public.exam_sessions(id) on delete set null;

-- Replace status CHECK to also allow 'proposed' and change default.
alter table public.exam_sessions
  alter column status drop default;

alter table public.exam_sessions
  drop constraint if exists exam_sessions_status_check;

alter table public.exam_sessions
  add constraint exam_sessions_status_check
  check (status in ('proposed','scheduled','in_progress','passed','failed'));

alter table public.exam_sessions
  alter column status set default 'proposed';

-- ---------------------------------------------------------------------------
-- 2. Visibility helpers (security definer)
-- ---------------------------------------------------------------------------

create or replace function app.parent_has_exam_session(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.exam_sessions es
    join public.parent_student_links psl on psl.student_profile_id = es.student_profile_id
    join public.parent_profiles pp on pp.id = psl.parent_profile_id
    where es.id = target_session
      and pp.is_active
      and pp.profile_id = auth.uid()
  );
$$;

create or replace function app.student_owns_exam_session(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.exam_sessions es
    join public.student_profiles sp on sp.id = es.student_profile_id
    where es.id = target_session
      and sp.is_active
      and sp.profile_id = auth.uid()
  );
$$;

create or replace function app.teacher_requested_exam_session(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.exam_sessions es
    join public.exam_requests er on er.id = es.exam_request_id
    join public.teacher_profiles tp on tp.id = er.requested_by
    where es.id = target_session
      and tp.is_active
      and tp.profile_id = auth.uid()
  );
$$;

revoke all on function app.parent_has_exam_session(uuid)        from public;
revoke all on function app.student_owns_exam_session(uuid)      from public;
revoke all on function app.teacher_requested_exam_session(uuid) from public;
grant execute on function app.parent_has_exam_session(uuid)        to authenticated;
grant execute on function app.student_owns_exam_session(uuid)      to authenticated;
grant execute on function app.teacher_requested_exam_session(uuid) to authenticated;
