-- Broaden visibility on exam_sessions and exam_requests so parents and
-- students can see their (child's) pending exams. Updates still restricted
-- to examiners/admins; parent/student responses go through a security-definer
-- RPC.

-- ---------------------------------------------------------------------------
-- exam_sessions: extend SELECT policy
-- ---------------------------------------------------------------------------

drop policy if exists exam_sessions_select on public.exam_sessions;

create policy exam_sessions_select
  on public.exam_sessions for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or app.current_examiner_profile_id(mosque_id) is not null
    or examiner_profile_id in (select app.current_teacher_profile_ids(mosque_id))
    or app.parent_has_exam_session(id)
    or app.student_owns_exam_session(id)
    or app.teacher_requested_exam_session(id)
  );

-- ---------------------------------------------------------------------------
-- exam_requests: extend SELECT policy
-- ---------------------------------------------------------------------------

drop policy if exists exam_requests_select on public.exam_requests;

create policy exam_requests_select
  on public.exam_requests for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or app.current_examiner_profile_id(mosque_id) is not null
    or requested_by in (select app.current_teacher_profile_ids(mosque_id))
    or app.parent_has_student(student_profile_id)
    or exists (
      select 1 from public.student_profiles sp
      where sp.id = exam_requests.student_profile_id
        and sp.profile_id = auth.uid()
        and sp.is_active
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: parent or student responds to a proposed schedule
-- ---------------------------------------------------------------------------

create or replace function app.respond_to_exam_schedule(
  p_session_id uuid,
  p_action text,
  p_counter_date date
) returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare v_role text;
begin
  if app.student_owns_exam_session(p_session_id) then
    v_role := 'student';
  elsif app.parent_has_exam_session(p_session_id) then
    v_role := 'parent';
  else
    raise exception 'not authorized';
  end if;

  if p_action = 'accept' then
    update public.exam_sessions
       set schedule_status = 'confirmed',
           exam_date = coalesce(proposed_date, exam_date),
           status = 'scheduled',
           updated_by = auth.uid()
     where id = p_session_id;
  elsif p_action = 'counter' then
    if p_counter_date is null then
      raise exception 'counter_date required';
    end if;
    update public.exam_sessions
       set schedule_status = 'counter_proposed',
           proposed_date = p_counter_date,
           proposed_by = v_role,
           updated_by = auth.uid()
     where id = p_session_id;
  else
    raise exception 'invalid action';
  end if;
end;
$$;

revoke all on function app.respond_to_exam_schedule(uuid, text, date) from public;
grant execute on function app.respond_to_exam_schedule(uuid, text, date) to authenticated;
