-- Track scheduled cancellation on mosque subscriptions.
alter table public.mosque_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancels_at timestamptz;
