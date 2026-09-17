-- Seed the production push webhook so notification_queue rows are delivered
-- the instant they land (via pg_net), rather than waiting for the daily cron.
--
-- The URL must be the deployed /api/notifications/send-push route, and the
-- secret must equal the PUSH_WEBHOOK_SECRET environment variable set in
-- Vercel (the route accepts either PUSH_WEBHOOK_SECRET or CRON_SECRET).
--
-- Run this in the Supabase SQL editor for the PRODUCTION project only.
-- Replace ${PUSH_WEBHOOK_SECRET} with the real value.

insert into app.push_webhook_config (id, url, secret)
values (1, 'https://mekteb.de/api/notifications/send-push', '${PUSH_WEBHOOK_SECRET}')
on conflict (id) do update
  set url = excluded.url,
      secret = excluded.secret,
      updated_at = now();
