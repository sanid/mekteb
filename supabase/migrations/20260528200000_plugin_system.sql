-- Plugin system.
-- plugin_registry is a platform-managed catalogue of all available features.
-- mosque_plugins is the per-mosque activation state.
-- When a new mosque is created, all registry plugins are auto-activated so
-- admins start with everything on and can turn off what they don't need.

create table public.plugin_registry (
  id text primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('education', 'assessment', 'communication', 'scheduling', 'reporting', 'integration')),
  config_schema jsonb,
  sort_order integer not null default 0,
  is_enabled boolean not null default true
);

create table public.mosque_plugins (
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  plugin_id text not null references public.plugin_registry(id) on delete cascade,
  is_active boolean not null default true,
  config jsonb not null default '{}',
  activated_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz default now(),
  updated_at timestamptz not null default now(),
  primary key (mosque_id, plugin_id)
);

create index mosque_plugins_mosque_id_idx on public.mosque_plugins (mosque_id);

create trigger set_updated_at
before update on public.mosque_plugins
for each row execute function app.set_updated_at();

-- When a mosque is created, activate all plugins for it automatically.
create or replace function app.auto_activate_plugins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mosque_plugins (mosque_id, plugin_id, is_active)
  select new.id, p.id, true
  from public.plugin_registry p
  where p.is_enabled = true
  on conflict (mosque_id, plugin_id) do nothing;
  return new;
end;
$$;

create trigger mosque_auto_activate_plugins
after insert on public.mosques
for each row execute function app.auto_activate_plugins();

-- Seed the plugin catalogue.
insert into public.plugin_registry (id, name, description, category, sort_order) values
  ('lesson_library',    'Lesson Library',    'Organize curriculum into topics and lessons. Teachers can link homework to lessons; parents can browse the library.',               'education',     10),
  ('exam_system',       'Exam System',       'Oral exams, written tests, diplomas, and result tracking. Includes the examiner portal.',                                         'assessment',    20),
  ('messaging',         'Direct Messaging',  'Private 1-to-1 chat between teachers, parents, and admins.',                                                                      'communication', 30),
  ('announcements',     'Announcements',     'Publish mosque-wide or group-specific announcements visible to all portal users.',                                                 'communication', 40),
  ('notifications',     'Notifications',     'In-app notification centre for exam updates, homework reminders, and messages.',                                                   'communication', 50),
  ('calendar',          'Calendar',          'Scheduling and event management for groups and the whole mosque.',                                                                 'scheduling',    60),
  ('annual_report',     'Annual Report',     'School-year PDF report with attendance, homework acknowledgement, and exam pass-rate statistics.',                                 'reporting',     70);

-- Activate all plugins for any mosques that already exist (handles db:reset
-- where the mosque is created before this migration inserts the registry rows).
insert into public.mosque_plugins (mosque_id, plugin_id, is_active)
select m.id, p.id, true
from public.mosques m
cross join public.plugin_registry p
on conflict (mosque_id, plugin_id) do nothing;

-- RLS
alter table public.plugin_registry enable row level security;
alter table public.mosque_plugins enable row level security;

-- Plugin registry is readable by any authenticated member.
create policy "authenticated read registry"
  on public.plugin_registry
  for select
  using (auth.uid() is not null);

-- Mosque admins can read and write their own mosque_plugins rows.
create policy "admin manage plugins"
  on public.mosque_plugins
  for all
  using (app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'mosque_admin'));

-- All mosque members can read active plugins (so layouts can fetch them).
create policy "member read active plugins"
  on public.mosque_plugins
  for select
  using (app.is_member(mosque_id));
