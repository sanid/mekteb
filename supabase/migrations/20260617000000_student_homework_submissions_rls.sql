-- Let students acknowledge their own homework.
--
-- `homework_submissions` had policies for admins, parents (select/insert/
-- update) and teachers (select) — but none for students. So the student
-- portal's "acknowledge" button and `acknowledgeHomework()` server action
-- always failed with a row-level security violation, and the nested
-- `homework_submissions(...)` select on the student homework page returned
-- nothing, leaving every item permanently unacknowledged.
--
-- Adds a security-definer helper plus the three missing policies, scoped so a
-- student can only ever touch their own submission rows.

create or replace function app.owns_student_profile(p_student_profile_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, app
as $$
  select exists (
    select 1
    from public.student_profiles sp
    where sp.id = p_student_profile_id
      and sp.profile_id = auth.uid()
      and sp.is_active
  );
$$;

comment on function app.owns_student_profile(uuid) is
  'True when the given student_profiles.id belongs to the signed-in user. Security definer to avoid recursive RLS evaluation on student_profiles.';

-- Students may read their own submissions (needed for the acknowledged state
-- to render at all).
drop policy if exists "homework_submissions_student_select" on public.homework_submissions;
create policy "homework_submissions_student_select"
  on public.homework_submissions
  for select
  to authenticated
  using (app.owns_student_profile(student_profile_id));

-- ...and record an acknowledgement for themselves.
drop policy if exists "homework_submissions_student_insert" on public.homework_submissions;
create policy "homework_submissions_student_insert"
  on public.homework_submissions
  for insert
  to authenticated
  with check (app.owns_student_profile(student_profile_id));

-- Update is required because the acknowledge path is an upsert; without it a
-- second acknowledgement raises instead of being a no-op.
drop policy if exists "homework_submissions_student_update" on public.homework_submissions;
create policy "homework_submissions_student_update"
  on public.homework_submissions
  for update
  to authenticated
  using (app.owns_student_profile(student_profile_id))
  with check (app.owns_student_profile(student_profile_id));
