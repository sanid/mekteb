-- Teachers can write lesson translations.
--
-- `lessons_write` has always allowed teachers in the mosque to edit lessons;
-- `lesson_translations` only ever had "admin full access" plus read policies,
-- so a teacher could look at a translation but never fix a wrong one or add a
-- missing locale. The teacher portal now carries the same tabbed translation
-- editor as the admin portal (shared `LessonEditForm`), which needs the
-- matching write branch. Scoped to the teacher's own mosque, like every other
-- teacher write policy; the `check_lesson_translation_mosque` trigger still
-- pins the row to its lesson's mosque.

create policy "teacher write translations"
  on public.lesson_translations for all
  to authenticated
  using (app.has_role(mosque_id, 'teacher'))
  with check (app.has_role(mosque_id, 'teacher'));
