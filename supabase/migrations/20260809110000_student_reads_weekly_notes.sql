-- Students can read published weekly notes for the groups they are enrolled in.
--
-- `teacher_weekly_notes_select` had read branches for platform owners, admins,
-- teachers and parents — and none for the student the notes are about. The
-- teacher portal has had a "weekly notes" view for months; the student portal
-- feature list wants one too, and until a student branch existed the query
-- behind it could only ever return zero rows (the same `is_member`-family bug
-- shape this repo keeps shipping; here the gate is `parent_has_group` /
-- `is_teacher_of_group`, both of which a student is deliberately not).
--
-- Read-only, and only published notes for groups the student is actively
-- enrolled in. Teachers still write; `teacher_weekly_notes_write` is unchanged.

drop policy if exists teacher_weekly_notes_select on public.teacher_weekly_notes;

create policy teacher_weekly_notes_select
  on public.teacher_weekly_notes for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_teacher_of_group(group_id)
    or (is_published and app.parent_has_group(group_id))
    or (is_published and app.student_in_group(group_id))
  );

comment on policy teacher_weekly_notes_select on public.teacher_weekly_notes is
  'Teachers write; parents and students read only published notes for their groups. Students hold no membership row, hence the student_in_group branch.';
