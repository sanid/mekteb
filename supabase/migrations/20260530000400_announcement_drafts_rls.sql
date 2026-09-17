-- Allow mosque admins and platform owners to see their own unpublished drafts.
-- Previously the select policy only allowed is_published = true, so admins
-- couldn't see drafts they had just created.
drop policy if exists "announcements_select" on public.announcements;

create policy "announcements_select" on public.announcements
  for select using (
    is_published = true
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
  );
