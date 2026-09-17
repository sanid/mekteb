-- The calendar lets any reader switch from "my lessons" to "everything the
-- mosque offers", students included — a child looking up when the Hifz class
-- they are thinking of joining meets should not have to ask.
--
-- `teaching_sessions_select` currently narrows students to
-- `app.student_in_group(group_id)`, which makes that switch return an empty
-- week for exactly the people most likely to use it. Widen the read to the
-- student's own mosque.
--
-- What this exposes is a timetable: when a class meets, and under which
-- group's name. No attendance, no notes about people, no enrolment lists —
-- those live in other tables with their own policies, all unchanged. The
-- equivalent paper version is pinned to the wall of the mosque.
--
-- **Consequence for callers:** RLS no longer scopes a student's timetable to
-- their own groups, so any screen that means "this student's lessons" must now
-- say so in its query. `/api/v1/calendar` filters by group for every role in
-- personal mode, and `/api/v1/widget` already passes an explicit group list.

drop policy if exists teaching_sessions_select on public.teaching_sessions;

create policy teaching_sessions_select on public.teaching_sessions
  for select
  using (
    app.is_member(mosque_id)
    or app.is_student(mosque_id)
    or app.is_platform_owner()
  );

comment on policy teaching_sessions_select on public.teaching_sessions is
  'The mosque timetable is readable by everyone who belongs to the mosque, students included. Narrowing to a person''s own groups is the caller''s job, not this policy''s.';
