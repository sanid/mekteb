-- Phase 3: controlled onboarding, OTP issuance, audit.
--
-- The actual credential still lives in auth.users.encrypted_password; we do
-- not store plaintext or a second hash here. otp_issues tracks the lifecycle
-- of a one-time password (issued → activated/expired/revoked) so admins can
-- see pending onboarding and enforce expiry.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'otp_status') then
    create type app.otp_status as enum ('pending', 'activated', 'expired', 'revoked');
  end if;
end $$;

create table public.otp_issues (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issued_by uuid references auth.users(id) on delete set null,
  status app.otp_status not null default 'pending',
  expires_at timestamptz not null,
  activated_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index otp_issues_mosque_status_idx
  on public.otp_issues (mosque_id, status);
create index otp_issues_user_id_idx on public.otp_issues (user_id);

create trigger set_updated_at
before update on public.otp_issues
for each row execute function app.set_updated_at();

-- Per-event audit of password/onboarding lifecycle. Separate from the
-- general-purpose audit_logs so we can retain/export it independently.
create table public.password_reset_audit (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid references public.mosques(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index password_reset_audit_mosque_created_idx
  on public.password_reset_audit (mosque_id, created_at desc);
create index password_reset_audit_user_idx
  on public.password_reset_audit (user_id, created_at desc);

create table public.login_audit (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid references public.mosques(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  success boolean not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index login_audit_mosque_created_idx
  on public.login_audit (mosque_id, created_at desc);
create index login_audit_user_idx
  on public.login_audit (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: admins (and platform owners) read their mosque's rows. Writes go
-- through service-role code in server actions / Edge Functions.
-- ---------------------------------------------------------------------------

alter table public.otp_issues           enable row level security;
alter table public.password_reset_audit enable row level security;
alter table public.login_audit          enable row level security;

create policy otp_issues_admin_select
  on public.otp_issues for select
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

create policy password_reset_audit_admin_select
  on public.password_reset_audit for select
  to authenticated
  using (
    (mosque_id is not null and app.has_role(mosque_id, 'mosque_admin'))
    or app.is_platform_owner()
  );

create policy login_audit_admin_select
  on public.login_audit for select
  to authenticated
  using (
    (mosque_id is not null and app.has_role(mosque_id, 'mosque_admin'))
    or app.is_platform_owner()
  );
