-- progress_notes: let the author manage their own notes.
--
-- The write policy was gated solely on `app.teacher_has_student(...)` — the
-- teacher of the student the note is about. Once a student's enrolment went
-- inactive (promoted to another group, removed) or the teacher left the
-- group, the author lost UPDATE/DELETE access to notes they wrote: the
-- select policy hid them too, so `/teacher/notes` and the group page stopped
-- rendering them and the edit/delete actions no-oped.
--
-- The app has always scoped note management to the author (every server
-- action and API route filters `author_profile_id = ctx.userId`), so the
-- policies now say so explicitly:
--
--   • SELECT: the author can always read their own notes.
--   • WRITE:  the author can update/delete their own notes as long as they
--     are still an active teacher of the group the note belongs to
--     (`is_teacher_of_group(group_id)`). Keeping the group condition means
--     INSERT is not widened — a teacher can only ever write notes for
--     students in groups they teach, exactly as before. A teacher who leaves
--     the group entirely keeps read access to their own notes (archive) but
--     can no longer edit them, matching `teacher_weekly_notes`.
--
-- Existing access is untouched: mosque admins and platform owners keep full
-- access, teachers of the student keep theirs, parents keep the
-- `visible_to_parents` branch, students keep their own branch.

drop policy progress_notes_select on public.progress_notes;
drop policy progress_notes_write on public.progress_notes;

create policy progress_notes_select
  on public.progress_notes for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_student(student_profile_id)
    or author_profile_id = auth.uid()
    or (visible_to_parents and app.parent_has_student(student_profile_id))
    or exists (
      select 1 from public.student_profiles sp
      where sp.id = progress_notes.student_profile_id
        and sp.profile_id = auth.uid()
    )
  );

create policy progress_notes_write
  on public.progress_notes for all
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_student(student_profile_id)
    or (author_profile_id = auth.uid() and app.is_teacher_of_group(group_id))
  )
  with check (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_student(student_profile_id)
    or (author_profile_id = auth.uid() and app.is_teacher_of_group(group_id))
  );
