-- The calendar becomes a screen every role opens, so the two tables the
-- previous migration deliberately left alone now have a reader.
--
-- `20260807000000_student_reads_mosque_and_lessons` closed with:
--
--   "Deliberately not touched: `calendar_events` and `group_categories` are
--    also member-only, but nothing in the student experience reads them yet."
--
-- That is no longer true. The week view draws its lesson colours from
-- `group_categories` and lists mosque events from `calendar_events`, and both
-- are gated on `app.is_member()` — which students, by design, are not. Without
-- this a student's calendar renders in the fallback grey with no events at
-- all, the same failure shape as the four bugs before it.
--
-- Read-only throughout. Students write neither their timetable nor the
-- mosque's events.

-- ── Category colours and names ─────────────────────────────────────────────

drop policy if exists group_categories_select on public.group_categories;

create policy group_categories_select
  on public.group_categories for select
  to authenticated
  using (
    app.is_member(mosque_id)
    or app.is_student(mosque_id)
    or app.is_platform_owner()
  );

-- ── Mosque events ──────────────────────────────────────────────────────────
--
-- `visibility` is either 'all' or a comma-separated role list, matched with a
-- substring test. Students need their own clause rather than an extra `or` on
-- the existing one: that branch reads `memberships`, and a student has no row
-- there, so it can never match them.

drop policy if exists calendar_events_select on public.calendar_events;

create policy calendar_events_select
  on public.calendar_events for select
  to authenticated
  using (
    (
      app.is_member(mosque_id) and (
        visibility = 'all'
        or app.has_role(mosque_id, 'mosque_admin')
        or app.is_platform_owner()
        or exists (
          select 1 from public.memberships m
          where m.user_id = auth.uid()
            and m.mosque_id = calendar_events.mosque_id
            and position(m.role::text in calendar_events.visibility) > 0
        )
      )
    )
    or (
      app.is_student(mosque_id)
      and (visibility = 'all' or position('student' in visibility) > 0)
    )
  );

comment on policy calendar_events_select on public.calendar_events is
  'Members see events addressed to their role; students see events marked ''all'' or naming ''student''. Students hold no membership row, hence the separate branch.';
