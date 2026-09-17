alter table public.notification_queue
  add column if not exists email_sent_at timestamptz;

create index if not exists notification_queue_email_pending_idx
  on public.notification_queue (id)
  where channel = 'email' and email_sent_at is null and status = 'sent';
