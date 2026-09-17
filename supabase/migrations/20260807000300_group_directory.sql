-- The calendar's "whole mosque" scope needs one thing the reader may not
-- otherwise see: the *name* of a group they are not attached to.
--
-- `groups_select` is deliberately narrow — a teacher reads the groups they
-- teach, a parent those their children attend, a student their own. That is
-- right for every other screen: `teacher/announcements` builds its audience
-- picker straight from `select * from groups` and leans on the policy to
-- narrow it, so widening `groups_select` would quietly offer a teacher every
-- group in the mosque to announce to.
--
-- So instead of loosening the table, expose the one harmless projection the
-- calendar needs. A group's name and room are what is printed on a timetable
-- pinned to the wall; who is *in* the group stays in `group_enrollments`,
-- untouched.
--
-- The view is security-definer (`security_invoker = off`, the default) so it
-- sees past `groups_select`, and carries the tenant check itself — without
-- that inner `where` it would expose every mosque to everyone.

create or replace view public.group_directory
with (security_invoker = off) as
  select
    g.id,
    g.mosque_id,
    g.name,
    g.room,
    g.category_id
  from public.groups g
  where
    app.is_member(g.mosque_id)
    or app.is_student(g.mosque_id)
    or app.is_platform_owner();

comment on view public.group_directory is
  'Group names and rooms for everyone who belongs to the mosque, for timetable labelling. Deliberately not backed by groups_select, which is narrower on purpose; carries its own tenant check because it is security-definer. Exposes no enrolment data.';

revoke all on public.group_directory from public;
grant select on public.group_directory to authenticated;
