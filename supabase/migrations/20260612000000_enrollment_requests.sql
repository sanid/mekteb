-- Parent self-service enrollment requests (waitlist).
--
-- A public, unauthenticated form lets a parent request a place for their child.
-- Rows land here with status 'pending' and show up in an admin review queue.
-- This keeps the "no open signup" rule: no auth user or membership is created
-- by the request — an admin still provisions the account through onboarding.
--
-- Inserts are performed server-side with the service-role client (after
-- validation + rate limiting), so RLS exposes the table to mosque admins only.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'enrollment_status') then
    create type app.enrollment_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table public.enrollment_requests (
  id               uuid        primary key default gen_random_uuid(),
  mosque_id        uuid        not null references public.mosques(id) on delete cascade,
  parent_name      text        not null,
  parent_email     text        not null,
  parent_phone     text,
  child_name       text        not null,
  child_birth_year integer     check (child_birth_year is null or (child_birth_year between 1900 and 2100)),
  message          text,
  status           app.enrollment_status not null default 'pending',
  reviewed_by      uuid        references auth.users(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index enrollment_requests_mosque_id_idx
  on public.enrollment_requests (mosque_id);
create index enrollment_requests_queue_idx
  on public.enrollment_requests (mosque_id, status, created_at desc);

create trigger set_updated_at
before update on public.enrollment_requests
for each row execute function app.set_updated_at();

-- RLS: mosque admins (and platform owners) manage the queue. There is
-- deliberately NO anon/authenticated insert policy — the public form writes
-- through the service-role client after server-side validation.
alter table public.enrollment_requests enable row level security;

create policy "admin manage enrollment_requests"
  on public.enrollment_requests
  for all
  using  (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- Register the plugin so admins can toggle the public waitlist on/off.
insert into public.plugin_registry (id, name, description, category, sort_order)
values (
  'enrollment',
  'Enrollment Requests',
  'Let parents request a place for their child through a public form. Requests land in an admin review queue — no account is created until an admin approves.',
  'communication',
  25
)
on conflict (id) do nothing;

insert into public.mosque_plugins (mosque_id, plugin_id, is_active)
select m.id, 'enrollment', true
from public.mosques m
on conflict (mosque_id, plugin_id) do nothing;
