-- Remove the 14-day trial. Starter plan is free — that is the free tier.
-- New mosques get an active Starter subscription immediately.
create or replace function app.auto_create_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mosque_subscriptions (mosque_id, plan_id, status)
  values (new.id, 'starter', 'active')
  on conflict (mosque_id) do nothing;
  return new;
end;
$$;
