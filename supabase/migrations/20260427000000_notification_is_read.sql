-- Add is_read to notification_queue so the UI can show an unread badge.
-- Also enables Supabase Realtime on the tables needed for live badge updates.

alter table public.notification_queue
  add column if not exists is_read boolean not null default false;

-- Users can mark their own notifications as read.
create policy notification_queue_update
  on public.notification_queue for update
  to authenticated
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());

-- Enable Realtime for live badge updates.
-- These tables must be in the supabase_realtime publication so that
-- postgres_changes subscriptions work on the client.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notification_queue;
