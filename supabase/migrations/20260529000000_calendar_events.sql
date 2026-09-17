-- Migration to add public.calendar_events table to support generic calendar events with role-based visibility.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  start_time time not null default '10:00:00',
  end_time time not null default '12:00:00',
  -- visibility: 'all' or comma-separated roles like 'teacher,parent'
  visibility text not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_mosque_date_idx on public.calendar_events (mosque_id, date);

-- set_updated_at trigger
create trigger set_updated_at
before update on public.calendar_events
for each row execute function app.set_updated_at();

-- Enable RLS
alter table public.calendar_events enable row level security;

-- Select policy: Scoped by mosque membership & role visibility
create policy calendar_events_select
  on public.calendar_events for select
  to authenticated
  using (
    app.is_member(mosque_id) and (
      visibility = 'all' 
      or app.has_role(mosque_id, 'mosque_admin')
      or app.is_platform_owner()
      or exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid() 
          and m.mosque_id = calendar_events.mosque_id
          and position(m.role::text in calendar_events.visibility) > 0
      )
    )
  );

-- All-actions policy for mosque administrators & platform owners
create policy calendar_events_admin_all
  on public.calendar_events for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());
