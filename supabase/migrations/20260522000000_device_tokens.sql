-- Device tokens for native push notifications (APNs / FCM).
-- Each row represents one device for one user. (user_id, token) is unique
-- so re-registering the same token updates the existing row.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'device_platform' and n.nspname = 'app'
  ) then
    create type app.device_platform as enum ('ios', 'android', 'web');
  end if;
end $$;

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform app.device_platform not null,
  token text not null,
  bundle_id text,
  app_version text,
  device_model text,
  locale text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  unique (user_id, token)
);

create index if not exists device_tokens_user_id_idx
  on public.device_tokens (user_id);
create index if not exists device_tokens_mosque_id_idx
  on public.device_tokens (mosque_id);

create trigger device_tokens_set_updated_at
  before update on public.device_tokens
  for each row execute function app.set_updated_at();

alter table public.device_tokens enable row level security;

-- Users can see / manage only their own device tokens.
create policy device_tokens_select_self on public.device_tokens
  for select to authenticated
  using (user_id = auth.uid());

create policy device_tokens_insert_self on public.device_tokens
  for insert to authenticated
  with check (user_id = auth.uid() and created_by = auth.uid() and updated_by = auth.uid());

create policy device_tokens_update_self on public.device_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and updated_by = auth.uid());

create policy device_tokens_delete_self on public.device_tokens
  for delete to authenticated
  using (user_id = auth.uid());

-- Mosque admins can read tokens of their members (for broadcast push).
create policy device_tokens_select_admin on public.device_tokens
  for select to authenticated
  using (app.has_role(mosque_id, 'mosque_admin'));

grant select, insert, update, delete on public.device_tokens to authenticated;
