-- Migration to add Mosque Calendar, Teaching Schedules, Sessions, and Categories

-- 1. Create group_categories table
create table public.group_categories (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  name text not null,
  color text not null default '#10b981',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mosque_id, name)
);

create index group_categories_mosque_id_idx on public.group_categories (mosque_id);

create trigger set_updated_at
before update on public.group_categories
for each row execute function app.set_updated_at();

-- 2. Alter groups table to reference group_categories
alter table public.groups
add column category_id uuid references public.group_categories(id) on delete set null;

create index groups_category_id_idx on public.groups (category_id);

-- 3. Create school_holidays table
create table public.school_holidays (
  id uuid primary key default gen_random_uuid(),
  state text not null default 'Berlin',
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state, start_date, end_date, name)
);

create index school_holidays_dates_idx on public.school_holidays (state, start_date, end_date);

create trigger set_updated_at
before update on public.school_holidays
for each row execute function app.set_updated_at();

-- 4. Create teaching_schedules table
create table public.teaching_schedules (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  category_id uuid not null references public.group_categories(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null default '10:00:00',
  end_time time not null default '12:00:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mosque_id, category_id, day_of_week)
);

create index teaching_schedules_mosque_id_idx on public.teaching_schedules (mosque_id);
create index teaching_schedules_category_id_idx on public.teaching_schedules (category_id);

create trigger set_updated_at
before update on public.teaching_schedules
for each row execute function app.set_updated_at();

-- 5. Create teaching_sessions table
create table public.teaching_sessions (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  date date not null,
  category_id uuid not null references public.group_categories(id) on delete cascade,
  start_time time not null default '10:00:00',
  end_time time not null default '12:00:00',
  is_cancelled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mosque_id, date, category_id)
);

create index teaching_sessions_lookup_idx on public.teaching_sessions (mosque_id, date);
create index teaching_sessions_category_id_idx on public.teaching_sessions (category_id);

create trigger set_updated_at
before update on public.teaching_sessions
for each row execute function app.set_updated_at();

-- 6. Enable RLS
alter table public.group_categories enable row level security;
alter table public.school_holidays enable row level security;
alter table public.teaching_schedules enable row level security;
alter table public.teaching_sessions enable row level security;

-- 7. Define RLS Policies
-- group_categories select
create policy group_categories_select
  on public.group_categories for select
  to authenticated
  using (app.is_member(mosque_id) or app.is_platform_owner());

-- group_categories write
create policy group_categories_admin_write
  on public.group_categories for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- school_holidays select (any logged-in user can read global holidays)
create policy school_holidays_select
  on public.school_holidays for select
  to authenticated
  using (true);

-- school_holidays write
create policy school_holidays_admin_write
  on public.school_holidays for all
  to authenticated
  using (app.is_platform_owner())
  with check (app.is_platform_owner());

-- teaching_schedules select
create policy teaching_schedules_select
  on public.teaching_schedules for select
  to authenticated
  using (app.is_member(mosque_id) or app.is_platform_owner());

-- teaching_schedules write
create policy teaching_schedules_admin_write
  on public.teaching_schedules for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- teaching_sessions select
create policy teaching_sessions_select
  on public.teaching_sessions for select
  to authenticated
  using (app.is_member(mosque_id) or app.is_platform_owner());

-- teaching_sessions write
create policy teaching_sessions_admin_write
  on public.teaching_sessions for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

-- 8. Seeding categories moved to seed.sql to avoid foreign key errors during DB initialization

-- 9. Seed Berlin School Holidays for 2025, 2026, and 2027
insert into public.school_holidays (state, name, start_date, end_date)
values
  -- 2025
  ('Berlin', 'Winterferien 2025', '2025-02-03', '2025-02-08'),
  ('Berlin', 'Osterferien 2025', '2025-04-14', '2025-04-25'),
  ('Berlin', 'Pfingstferien 2025', '2025-06-10', '2025-06-10'),
  ('Berlin', 'Sommerferien 2025', '2025-07-24', '2025-09-05'),
  ('Berlin', 'Herbstferien 2025', '2025-10-20', '2025-11-01'),
  ('Berlin', 'Weihnachtsferien 2025', '2025-12-22', '2026-01-02'),
  -- 2026
  ('Berlin', 'Winterferien 2026', '2026-02-02', '2026-02-07'),
  ('Berlin', 'Osterferien 2026', '2026-03-30', '2026-04-10'),
  ('Berlin', 'Pfingstferien 2026', '2026-05-22', '2026-05-22'),
  ('Berlin', 'Sommerferien 2026', '2026-07-16', '2026-08-28'),
  ('Berlin', 'Herbstferien 2026', '2026-10-19', '2026-10-31'),
  ('Berlin', 'Weihnachtsferien 2026', '2026-12-21', '2027-01-02'),
  -- 2027
  ('Berlin', 'Winterferien 2027', '2027-02-01', '2027-02-06'),
  ('Berlin', 'Osterferien 2027', '2027-03-22', '2027-04-02'),
  ('Berlin', 'Pfingstferien 2027', '2027-05-18', '2027-05-19'),
  ('Berlin', 'Sommerferien 2027', '2027-07-22', '2027-09-03'),
  ('Berlin', 'Herbstferien 2027', '2027-10-11', '2027-10-23'),
  ('Berlin', 'Weihnachtsferien 2027', '2027-12-22', '2028-01-05')
on conflict do nothing;
