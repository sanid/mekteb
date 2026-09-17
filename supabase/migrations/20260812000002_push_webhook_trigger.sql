-- Instant push delivery on notification_queue insert.
--
-- Every notification type (message, announcement, homework, absence,
-- lesson-cancelled, exam, written-test) fans out into notification_queue —
-- most via the trigger functions in 20260427000011_notification_fanout_triggers.sql,
-- exams/written-tests via the app's enqueueExamNotifications(). A single
-- trigger here therefore catches them all the moment a row lands, and asks
-- the web app to deliver the push immediately via pg_net (async HTTP) instead
-- of waiting for the next cron tick.
--
-- The webhook target is configured in app.push_webhook_config (single row),
-- so the trigger is dormant until a deploy sets URL + secret. The cron route
-- /api/notifications/send-push remains as the retry backstop for rows whose
-- first delivery attempt fails transiently.

create table if not exists app.push_webhook_config (
  id integer primary key default 1 check (id = 1),
  url text not null,
  secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app.notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config app.push_webhook_config%rowtype;
begin
  select * into v_config from app.push_webhook_config limit 1;
  if v_config is null or v_config.url = '' or v_config.secret = '' then
    -- Not configured — the cron backstop will pick this row up later.
    return new;
  end if;

  perform net.http_post(
    v_config.url,
    jsonb_build_object('notificationId', new.id),
    '{}'::jsonb,
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_config.secret
    ),
    30000
  );

  return new;
end;
$$;

revoke all on function app.notify_push_webhook() from public;
grant execute on function app.notify_push_webhook() to authenticated, service_role;

drop trigger if exists notification_queue_push_webhook on public.notification_queue;
create trigger notification_queue_push_webhook
  after insert on public.notification_queue
  for each row
  execute function app.notify_push_webhook();

-- Config is deploy-private: only postgres/service_role reads it.
alter table app.push_webhook_config enable row level security;
create policy push_webhook_config_service on app.push_webhook_config
  for select to service_role using (true);
create policy push_webhook_config_authenticated on app.push_webhook_config
  for select to authenticated using (false);
