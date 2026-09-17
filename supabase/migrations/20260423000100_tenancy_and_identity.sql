-- Phase 0: tenancy + identity baseline.
-- Separates auth identity (auth.users) from domain membership in a mosque
-- so a single login can later join multiple mosques with different roles.

create table public.mosques (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  locale text not null default 'de',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create trigger set_updated_at
before update on public.mosques
for each row execute function app.set_updated_at();

-- Mosque-specific branding + settings kept in their own tables so the
-- mosques row stays small and cacheable.
create table public.mosque_settings (
  mosque_id uuid primary key references public.mosques(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.mosque_settings
for each row execute function app.set_updated_at();

create table public.mosque_branding (
  mosque_id uuid primary key references public.mosques(id) on delete cascade,
  logo_url text,
  primary_color text,
  secondary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.mosque_branding
for each row execute function app.set_updated_at();

-- 1:1 application profile for every auth.users row. Contains only data
-- that's true regardless of which mosque the user is acting in.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  phone text,
  avatar_url text,
  must_rotate_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.profiles
for each row execute function app.set_updated_at();

-- A user's role inside a mosque. One user may hold multiple memberships
-- (e.g. parent in one mosque, teacher in another; or parent + teacher in
-- the same mosque with two rows).
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  role app.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (user_id, mosque_id, role)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_mosque_id_idx on public.memberships (mosque_id);

create trigger set_updated_at
before update on public.memberships
for each row execute function app.set_updated_at();

-- Audit log sink for privileged and security-sensitive actions. All
-- phases append here via server-side code (Edge Functions / triggers).
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid references public.mosques(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_mosque_id_created_at_idx
  on public.audit_logs (mosque_id, created_at desc);
