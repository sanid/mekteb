-- Two things a student cannot see about themselves.
--
-- Both were found building the home-screen widgets, and both are the same
-- shape as `20260618000000_student_attendance_sessions_rls`: a policy written
-- for the roles that sit in `memberships`, when students deliberately do not.
--
-- 1. `teaching_sessions_select` requires `app.is_member(mosque_id)`. Students
--    are not members — the API itself falls back to `student_profiles` for
--    them — so **no student can see when their own classes are**. Not just on
--    the widget: any screen showing a schedule would have come back empty.
--
-- 2. `hifz_progress` has policies for teachers, parents and admins, and none
--    for the student the row is about. So a student could not read their own
--    memorisation progress, which is the one number the feature exists to show
--    them.
--
-- Both stay read-only. A student records neither their timetable nor their own
-- hifz assessment; teachers write those, and that has not changed.

-- ── Timetable ──────────────────────────────────────────────────────────────

drop policy if exists teaching_sessions_select on public.teaching_sessions;

create policy teaching_sessions_select on public.teaching_sessions
  for select
  using (
    app.is_member(mosque_id)
    or app.is_platform_owner()
    -- Scoped to the groups they are actually enrolled in, not the whole
    -- mosque's timetable.
    or app.student_in_group(group_id)
  );

-- ── Hifz ───────────────────────────────────────────────────────────────────

drop policy if exists "student reads own hifz_progress" on public.hifz_progress;

create policy "student reads own hifz_progress" on public.hifz_progress
  for select
  using (
    exists (
      select 1
      from public.student_profiles sp
      where sp.id = hifz_progress.student_profile_id
        and sp.profile_id = auth.uid()
    )
  );
