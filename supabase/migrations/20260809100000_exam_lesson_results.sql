-- exam_lesson_results — lessons an examiner ticks off during an oral exam.
--
-- During an exam (status in_progress), the examiner runs through the mosque's
-- curriculum and ticks the lessons the student recites correctly. Each tick is
-- one row; unticked lessons in the result are the ones to repeat.
--
-- Visibility mirrors exam_sessions: the session's examiner, any examiner in
-- the mosque, the requesting teacher, the student and their parents can read;
-- only the session's own examiner (or an admin) writes, and never after the
-- result is terminal.

create table public.exam_lesson_results (
  id               uuid        primary key default gen_random_uuid(),
  mosque_id        uuid        not null references public.mosques(id) on delete cascade,
  exam_session_id  uuid        not null references public.exam_sessions(id) on delete cascade,
  lesson_id        uuid        not null references public.lessons(id) on delete cascade,
  passed           boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid        references auth.users(id) on delete set null,
  updated_by       uuid        references auth.users(id) on delete set null,
  unique (exam_session_id, lesson_id)
);

create index exam_lesson_results_mosque_id_idx  on public.exam_lesson_results (mosque_id);
create index exam_lesson_results_session_idx    on public.exam_lesson_results (exam_session_id);
create index exam_lesson_results_lesson_idx     on public.exam_lesson_results (lesson_id);

create trigger set_updated_at
  before update on public.exam_lesson_results
  for each row execute function app.set_updated_at();

-- Cross-mosque invariant: the session and the lesson must belong to the same
-- mosque as the row itself.
create or replace function app.check_exam_lesson_result_mosque()
returns trigger
language plpgsql
as $$
declare
  session_mosque uuid;
  lesson_mosque  uuid;
begin
  select mosque_id into session_mosque from public.exam_sessions where id = NEW.exam_session_id;
  select mosque_id into lesson_mosque  from public.lessons        where id = NEW.lesson_id;
  if session_mosque is distinct from NEW.mosque_id
     or lesson_mosque is distinct from NEW.mosque_id then
    raise exception 'exam_lesson_results: mosque_id must match session and lesson mosques';
  end if;
  return NEW;
end;
$$;

create trigger exam_lesson_results_mosque_check
  before insert or update on public.exam_lesson_results
  for each row execute function app.check_exam_lesson_result_mosque();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.exam_lesson_results enable row level security;

create policy exam_lesson_results_select
  on public.exam_lesson_results for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or exists (
      select 1
      from public.exam_sessions es
      where es.id = exam_lesson_results.exam_session_id
        and (
          es.examiner_profile_id in (select app.current_teacher_profile_ids(exam_lesson_results.mosque_id))
          or app.current_examiner_profile_id(exam_lesson_results.mosque_id) is not null
          or app.parent_has_exam_session(es.id)
          or app.student_owns_exam_session(es.id)
          or app.teacher_requested_exam_session(es.id)
        )
    )
  );

-- Only the session's own examiner (or an admin) ticks lessons, and only while
-- the result is not terminal — a tick after the exam is recorded would
-- silently rewrite what the teacher already saw.
create policy exam_lesson_results_write
  on public.exam_lesson_results for insert
  to authenticated
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or exists (
      select 1
      from public.exam_sessions es
      where es.id = exam_lesson_results.exam_session_id
        and es.examiner_profile_id in (select app.current_teacher_profile_ids(exam_lesson_results.mosque_id))
        and es.status not in ('passed', 'failed')
    )
  );

create policy exam_lesson_results_update
  on public.exam_lesson_results for update
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or exists (
      select 1
      from public.exam_sessions es
      where es.id = exam_lesson_results.exam_session_id
        and es.examiner_profile_id in (select app.current_teacher_profile_ids(exam_lesson_results.mosque_id))
        and es.status not in ('passed', 'failed')
    )
  );

create policy exam_lesson_results_delete
  on public.exam_lesson_results for delete
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or exists (
      select 1
      from public.exam_sessions es
      where es.id = exam_lesson_results.exam_session_id
        and es.examiner_profile_id in (select app.current_teacher_profile_ids(exam_lesson_results.mosque_id))
        and es.status not in ('passed', 'failed')
    )
  );
