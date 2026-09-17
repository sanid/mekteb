-- Students can finally see the app they are given.
--
-- Same root cause as the attendance, timetable and hifz fixes before it, but
-- with much wider blast radius: these policies gate on `app.is_member()`, and
-- **students are deliberately not in `memberships`** (auth identity is
-- separate from domain membership — see the design notes). Every one of them
-- therefore returned nothing to a student.
--
-- What that actually looked like in the app, signed in as a student:
--
--   * `/auth/me` returned `plugins: []`, because `mosque_plugins` was
--     unreadable. Plugins drive every tab and card, so the student's app hid
--     the lesson library, exams, announcements, messaging, notifications and
--     the hifz card — an app with almost nothing in it.
--   * Every plugin-gated endpoint answered "This feature is not enabled for
--     your mosque", including `/student/hifz`.
--   * `mosqueName` was null, because `mosques` was unreadable too.
--   * The lesson library was empty: `lessons`, `topics` and `lesson_resources`
--     are all member-gated.
--
-- `lesson_translations` deserves its own mention: the policy is *named*
-- "student read published" and requires `is_member(...) AND
-- has_role(..., 'student')`. A student has neither, so it could never match a
-- single row. It now uses `app.is_student()`, which is what it always meant.
--
-- Students stay read-only, and only for published content in their own
-- mosque. `app.is_student(mosque)` already existed and checks exactly that:
-- an active `student_profiles` row for `auth.uid()` in that mosque.

-- ── Identity and feature flags ──────────────────────────────────────────────

drop policy if exists mosques_member_select on public.mosques;
create policy mosques_member_select on public.mosques
  for select
  using (app.is_member(id) or app.is_student(id) or app.is_platform_owner());

drop policy if exists "member read active plugins" on public.mosque_plugins;
create policy "member read active plugins" on public.mosque_plugins
  for select
  using (app.is_member(mosque_id) or app.is_student(mosque_id));

drop policy if exists mosque_branding_member_select on public.mosque_branding;
create policy mosque_branding_member_select on public.mosque_branding
  for select
  using (
    app.is_member(mosque_id)
    or app.is_student(mosque_id)
    or app.is_platform_owner()
  );

-- ── Lesson library ─────────────────────────────────────────────────────────
--
-- Note the asymmetry, which is deliberate: an admin or teacher may read
-- unpublished drafts, a student may not — `is_published` is required on the
-- student branch.

drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons
  for select
  using (
    app.is_platform_owner()
    or (
      app.is_member(mosque_id)
      and (
        is_published
        or app.has_role(mosque_id, 'mosque_admin'::app.app_role)
        or app.has_role(mosque_id, 'teacher'::app.app_role)
      )
    )
    or (app.is_student(mosque_id) and is_published)
  );

drop policy if exists topics_select on public.topics;
create policy topics_select on public.topics
  for select
  using (
    app.is_platform_owner()
    or (
      app.is_member(mosque_id)
      and (
        is_published
        or app.has_role(mosque_id, 'mosque_admin'::app.app_role)
        or app.has_role(mosque_id, 'teacher'::app.app_role)
      )
    )
    or (app.is_student(mosque_id) and is_published)
  );

drop policy if exists lesson_resources_select on public.lesson_resources;
create policy lesson_resources_select on public.lesson_resources
  for select
  using (
    app.is_platform_owner()
    or app.is_member(mosque_id)
    -- Attachments follow their lesson: readable only once it is published.
    or (
      app.is_student(mosque_id)
      and exists (
        select 1
        from public.lessons l
        where l.id = lesson_resources.lesson_id
          and l.is_published
      )
    )
  );

drop policy if exists "student read published" on public.lesson_translations;
create policy "student read published" on public.lesson_translations
  for select
  using (
    app.is_student(mosque_id)
    and exists (
      select 1
      from public.lessons l
      where l.id = lesson_translations.lesson_id
        and l.is_published
    )
  );

-- ── Timetable ──────────────────────────────────────────────────────────────
--
-- The sibling of `teaching_sessions` in
-- `20260805000400_student_schedule_and_hifz_rls`: the recurring schedule was
-- still member-only, so a student could see individual sessions but not the
-- weekly pattern they come from.

drop policy if exists teaching_schedules_select on public.teaching_schedules;
create policy teaching_schedules_select on public.teaching_schedules
  for select
  using (
    app.is_member(mosque_id)
    or app.is_student(mosque_id)
    or app.is_platform_owner()
  );

-- Deliberately not touched: `calendar_events` and `group_categories` are also
-- member-only, but nothing in the student experience reads them yet. Adding
-- access nobody uses is how policies drift away from what they mean.
