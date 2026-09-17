-- Push delivery tracking, mirroring email_sent_at.
--
-- The fanout triggers hardcode `channel = 'email'` on every notification_queue
-- row (see 20260424000000_communication.sql), so the push sender must NOT
-- filter on `channel = 'push'` — that matches nothing. It selects rows with
-- `pushed_at is null` instead, which also makes the job idempotent: a re-run
-- never re-pushes what already went out, and the first run does not re-send
-- months of history (the sender additionally caps by created_at).
alter table public.notification_queue
  add column if not exists pushed_at timestamptz;

create index if not exists notification_queue_push_pending_idx
  on public.notification_queue (id)
  where pushed_at is null and status = 'sent';
