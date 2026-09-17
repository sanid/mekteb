-- Phase 0: RLS baseline.
-- Principle: every business table has RLS on. Access is decided by helpers
-- that read the caller's auth.uid() and look up memberships. Frontend
-- filtering is never trusted.

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

-- True if the current auth user holds `role` in `mosque_id` (and membership
-- is active). security definer so RLS on memberships doesn't recurse.
create or replace function app.has_role(target_mosque uuid, target_role app.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.mosque_id = target_mosque
      and m.role = target_role
      and m.is_active
  );
$$;

-- True if the current auth user has any active membership in `mosque_id`.
create or replace function app.is_member(target_mosque uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.mosque_id = target_mosque
      and m.is_active
  );
$$;

-- True if the caller is a platform owner anywhere. Platform owners are the
-- internal maintenance team and bypass tenant scoping.
create or replace function app.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.role = 'platform_owner'
      and m.is_active
  );
$$;

revoke all on function app.has_role(uuid, app.app_role) from public;
revoke all on function app.is_member(uuid) from public;
revoke all on function app.is_platform_owner() from public;
grant execute on function app.has_role(uuid, app.app_role) to authenticated;
grant execute on function app.is_member(uuid) to authenticated;
grant execute on function app.is_platform_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table introduced so far
-- ---------------------------------------------------------------------------

alter table public.mosques          enable row level security;
alter table public.mosque_settings  enable row level security;
alter table public.mosque_branding  enable row level security;
alter table public.profiles         enable row level security;
alter table public.memberships      enable row level security;
alter table public.audit_logs       enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: users read/update their own; platform owners read all
-- ---------------------------------------------------------------------------

create policy profiles_self_select
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or app.is_platform_owner());

create policy profiles_self_update
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- insert is done server-side via service role (controlled onboarding in Phase 3)

-- ---------------------------------------------------------------------------
-- memberships: user sees own rows; mosque admins see rows in their mosque
-- ---------------------------------------------------------------------------

create policy memberships_self_select
  on public.memberships for select
  to authenticated
  using (
    user_id = auth.uid()
    or app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
  );

-- Writes go through Edge Functions with the service role; no client-side
-- insert/update/delete policies are granted here on purpose.

-- ---------------------------------------------------------------------------
-- mosques + settings + branding: readable to members; writable to admins
-- ---------------------------------------------------------------------------

create policy mosques_member_select
  on public.mosques for select
  to authenticated
  using (app.is_member(id) or app.is_platform_owner());

create policy mosques_admin_update
  on public.mosques for update
  to authenticated
  using (app.has_role(id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(id, 'mosque_admin') or app.is_platform_owner());

create policy mosque_settings_member_select
  on public.mosque_settings for select
  to authenticated
  using (app.is_member(mosque_id) or app.is_platform_owner());

create policy mosque_settings_admin_write
  on public.mosque_settings for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

create policy mosque_branding_member_select
  on public.mosque_branding for select
  to authenticated
  using (app.is_member(mosque_id) or app.is_platform_owner());

create policy mosque_branding_admin_write
  on public.mosque_branding for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- ---------------------------------------------------------------------------
-- audit_logs: mosque admins and platform owners can read; writes are
-- service-role-only (Edge Functions).
-- ---------------------------------------------------------------------------

create policy audit_logs_admin_select
  on public.audit_logs for select
  to authenticated
  using (
    (mosque_id is not null and app.has_role(mosque_id, 'mosque_admin'))
    or app.is_platform_owner()
  );

-- ---------------------------------------------------------------------------
-- Auto-provision a profile row when a new auth.users row is created.
-- ---------------------------------------------------------------------------

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  insert into public.profiles (id, full_name, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
