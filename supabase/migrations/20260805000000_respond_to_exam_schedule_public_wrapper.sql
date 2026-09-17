-- `app.respond_to_exam_schedule` is unreachable from any client.
--
-- PostgREST only exposes the schemas listed in `api.schemas` (public,
-- graphql_public) — `extra_search_path` widens the search_path *inside* a
-- request, it does not make a function callable. So every
-- `supabase.rpc("respond_to_exam_schedule")` in the app has always come back
-- PGRST202 "Could not find the function public.respond_to_exam_schedule",
-- which means accepting or counter-proposing an exam date has never worked
-- for a parent or a student, on web or anywhere else.
--
-- The fix is a thin public wrapper. The authorization stays where it is: the
-- `app` function is security definer, decides caller role itself
-- (`student_owns_exam_session` / `parent_has_exam_session`) and raises
-- otherwise, so the wrapper deliberately runs as the *invoker* and adds no
-- privilege of its own.

create or replace function public.respond_to_exam_schedule(
  p_session_id uuid,
  p_action text,
  -- Defaulted so callers may omit it for accept, and so generated clients type
  -- it as optional rather than "string that must be null".
  p_counter_date date default null
) returns void
language sql
security invoker
set search_path = public, app
as $$
  select app.respond_to_exam_schedule(p_session_id, p_action, p_counter_date);
$$;

revoke all on function public.respond_to_exam_schedule(uuid, text, date) from public;
grant execute on function public.respond_to_exam_schedule(uuid, text, date) to authenticated;

comment on function public.respond_to_exam_schedule(uuid, text, date) is
  'PostgREST-callable wrapper for app.respond_to_exam_schedule. Authorization lives in the app function.';

-- Cancelling has the same problem from the other direction: `exam_sessions`
-- has no UPDATE policy for parents or students (only admin, platform owner and
-- examiner), so the parent/student "cancel exam" path updated **zero rows**
-- and reported success — PostgREST does not error on an update that matches
-- nothing.
--
-- Widening the UPDATE policy would be the wrong fix: it would let a student
-- write any column on the row, including `status = 'passed'`. A narrow
-- security-definer function can only ever do the one thing.

create or replace function app.cancel_exam_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if not (
    app.student_owns_exam_session(p_session_id)
    or app.parent_has_exam_session(p_session_id)
  ) then
    raise exception 'not authorized';
  end if;

  update public.exam_sessions
     set status = 'cancelled',
         updated_by = auth.uid(),
         updated_at = now()
   where id = p_session_id
     -- A finished exam is history; cancelling one would rewrite a result.
     and status in ('proposed', 'scheduled');

  if not found then
    raise exception 'session_not_found_or_completed';
  end if;
end;
$$;

revoke all on function app.cancel_exam_session(uuid) from public;
grant execute on function app.cancel_exam_session(uuid) to authenticated;

create or replace function public.cancel_exam_session(p_session_id uuid)
returns void
language sql
security invoker
set search_path = public, app
as $$
  select app.cancel_exam_session(p_session_id);
$$;

revoke all on function public.cancel_exam_session(uuid) from public;
grant execute on function public.cancel_exam_session(uuid) to authenticated;

comment on function public.cancel_exam_session(uuid) is
  'Lets the student or a linked parent cancel a proposed/scheduled exam. Authorization lives in app.cancel_exam_session.';
