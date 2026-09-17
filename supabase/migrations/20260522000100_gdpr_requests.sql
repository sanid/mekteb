-- DSGVO / GDPR self-service requests.
-- Two flows:
--   * export    — backend gathers the user's data, emails it as JSON.
--                 status: pending -> processing -> sent (or failed).
--   * deletion  — creates a request the mosque admin must action manually.
--                 status: pending -> completed (or rejected).
--
-- Users can create + see their own requests; mosque admins see all requests
-- for their mosque. A trigger fans out a notification to every active admin
-- of the user's mosque when a deletion request is created.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'gdpr_request_type') then
    create type app.gdpr_request_type as enum ('export', 'deletion');
  end if;
  if not exists (select 1 from pg_type where typname = 'gdpr_request_status') then
    create type app.gdpr_request_status as enum (
      'pending', 'processing', 'sent', 'completed', 'rejected', 'failed'
    );
  end if;
end $$;

create table if not exists public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  type app.gdpr_request_type not null,
  status app.gdpr_request_status not null default 'pending',
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id)
);

create index if not exists gdpr_requests_user_id_idx
  on public.gdpr_requests (user_id);
create index if not exists gdpr_requests_mosque_status_idx
  on public.gdpr_requests (mosque_id, status, requested_at desc);

create trigger gdpr_requests_set_updated_at
  before update on public.gdpr_requests
  for each row execute function app.set_updated_at();

alter table public.gdpr_requests enable row level security;

-- Users see + create their own requests.
create policy gdpr_requests_select_self on public.gdpr_requests
  for select to authenticated
  using (user_id = auth.uid());

create policy gdpr_requests_insert_self on public.gdpr_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and created_by = auth.uid()
    and updated_by = auth.uid()
  );

-- Admins see + manage all requests in their mosque.
create policy gdpr_requests_select_admin on public.gdpr_requests
  for select to authenticated
  using (app.has_role(mosque_id, 'mosque_admin'));

create policy gdpr_requests_update_admin on public.gdpr_requests
  for update to authenticated
  using (app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'mosque_admin'));

grant select, insert, update on public.gdpr_requests to authenticated;

-- ── Notify admins of new deletion requests ────────────────────────────────
create or replace function app.notify_gdpr_deletion_request()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  admin_record record;
  display_email text;
begin
  if new.type <> 'deletion' then
    return new;
  end if;

  display_email := coalesce(new.email, 'a user');

  for admin_record in
    select m.user_id
    from public.memberships m
    where m.mosque_id = new.mosque_id
      and m.role = 'mosque_admin'
      and m.is_active = true
  loop
    insert into public.notification_queue (
      mosque_id,
      recipient_profile_id,
      channel,
      subject,
      body,
      status,
      is_read
    ) values (
      new.mosque_id,
      admin_record.user_id,
      'email',
      'GDPR deletion request',
      'A user (' || display_email || ') has requested account deletion. '
        || 'Please review and process it in the admin panel.',
      'pending',
      false
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists gdpr_requests_notify_admins on public.gdpr_requests;
create trigger gdpr_requests_notify_admins
  after insert on public.gdpr_requests
  for each row execute function app.notify_gdpr_deletion_request();
