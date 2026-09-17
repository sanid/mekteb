-- SaaS billing tables.
-- Plans are defined here; mosques get one subscription row linking to a plan
-- and a Stripe customer/subscription.

create table public.plans (
  id text primary key,
  name text not null,
  description text not null,
  price_monthly_eur integer not null default 0,  -- cents, 0 = free
  max_students integer,                           -- null = unlimited
  features jsonb not null default '[]',
  is_active boolean not null default true,
  sort_order integer not null default 0
);

insert into public.plans (id, name, description, price_monthly_eur, max_students, features, sort_order) values
  ('starter',   'Starter',    'Perfect for small mosques getting started.',           0,    30,   '["Up to 30 students","All core features","Email support"]',                                        10),
  ('growth',    'Growth',     'For growing mosques with multiple classes.',           4900, 150,  '["Up to 150 students","All features + exams","Priority support","Custom branding"]',              20),
  ('community', 'Community',  'Unlimited scale for large education programmes.',     9900, null, '["Unlimited students","Everything in Growth","Dedicated onboarding","SLA guarantee"]',            30);

create table public.mosque_subscriptions (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null unique references public.mosques(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled', 'suspended')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mosque_subscriptions_mosque_id_idx on public.mosque_subscriptions (mosque_id);
create index mosque_subscriptions_stripe_customer_idx on public.mosque_subscriptions (stripe_customer_id);

create trigger set_updated_at
before update on public.mosque_subscriptions
for each row execute function app.set_updated_at();

-- When a mosque is created via the SaaS onboarding flow, auto-create a
-- 14-day starter trial subscription.
create or replace function app.auto_create_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mosque_subscriptions (mosque_id, plan_id, status, trial_ends_at)
  values (new.id, 'starter', 'trialing', now() + interval '14 days')
  on conflict (mosque_id) do nothing;
  return new;
end;
$$;

create trigger mosque_auto_subscription
after insert on public.mosques
for each row execute function app.auto_create_subscription();

-- Auto-create for existing mosques (dev seed).
insert into public.mosque_subscriptions (mosque_id, plan_id, status)
select id, 'community', 'active'
from public.mosques
on conflict (mosque_id) do nothing;

-- RLS: plans are public-readable; subscriptions are admin + platform_owner only.
alter table public.plans enable row level security;
alter table public.mosque_subscriptions enable row level security;

create policy "plans public read"
  on public.plans for select using (true);

create policy "admin read own subscription"
  on public.mosque_subscriptions for select
  using (app.has_role(mosque_id, 'mosque_admin'));

create policy "platform owner full access"
  on public.mosque_subscriptions for all
  using (app.is_platform_owner())
  with check (app.is_platform_owner());
