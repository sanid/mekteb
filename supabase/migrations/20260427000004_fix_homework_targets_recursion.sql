-- homework_targets_write uses a raw subquery against homework_assignments.
-- Because it is an ALL policy, its USING clause runs on SELECT too, which
-- means: read homework_assignments → homework_assignments_select reads
-- homework_targets → homework_targets_write USING reads homework_assignments
-- → infinite recursion.
--
-- Fix: replace the inline EXISTS subquery with app.teacher_has_homework(),
-- which is already SECURITY DEFINER and therefore bypasses RLS when it
-- reads homework_assignments internally.

drop policy if exists homework_targets_write on public.homework_targets;

create policy homework_targets_write
  on public.homework_targets for all
  to authenticated
  using (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_homework(homework_id)
  )
  with check (
    app.is_platform_owner()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.teacher_has_homework(homework_id)
  );
