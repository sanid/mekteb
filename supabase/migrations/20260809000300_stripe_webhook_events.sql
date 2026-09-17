-- Stripe webhook idempotency guard.
--
-- Stripe can redeliver the same event (network retries, or a "resend" from
-- the dashboard). Every handler in `/api/webhooks/stripe` upserts, so a
-- replay is nearly harmless today — but recording processed event ids makes
-- replays *never* double-apply and gives an audit trail of what Stripe
-- actually delivered. The webhook route checks this table before processing
-- and inserts after the handler switch completes (so a failed attempt is
-- retried on redelivery).

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- No policies: only the service-role client (webhook route) reads or writes
-- this table; RLS blocks every authenticated role.
