-- Quran Hifz (memorisation) tracker plugin.
--
-- group_categories.is_hifz marks a category as a Hifz group type; any group
-- in that category gets the Hifz tracker instead of (or alongside) the regular
-- lesson/homework sections.
--
-- hifz_progress stores the current memorised-pages count per student per group.
-- One row per (student, group) pair; updated in place via upsert.

-- 1. Extend group_categories with an is_hifz flag.
alter table public.group_categories
  add column if not exists is_hifz boolean not null default false;

-- 2. hifz_progress table.
create table public.hifz_progress (
  id                 uuid        primary key default gen_random_uuid(),
  mosque_id          uuid        not null references public.mosques(id) on delete cascade,
  student_profile_id uuid        not null references public.student_profiles(id) on delete cascade,
  group_id           uuid        not null references public.groups(id) on delete cascade,
  pages_memorized    integer     not null default 0
                                 check (pages_memorized >= 0 and pages_memorized <= 604),
  notes              text,
  created_by         uuid        references auth.users(id) on delete set null,
  updated_by         uuid        references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (student_profile_id, group_id)
);

create index hifz_progress_mosque_id_idx          on public.hifz_progress (mosque_id);
create index hifz_progress_student_profile_id_idx on public.hifz_progress (student_profile_id);
create index hifz_progress_group_id_idx           on public.hifz_progress (group_id);

create trigger set_updated_at
before update on public.hifz_progress
for each row execute function app.set_updated_at();

-- Mosque invariant: student, group, and progress row must all belong to the
-- same mosque.
create or replace function app.check_hifz_progress_mosque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mosque_id uuid;
begin
  select mosque_id into v_mosque_id
  from public.student_profiles where id = new.student_profile_id;
  if v_mosque_id is distinct from new.mosque_id then
    raise exception 'hifz_progress: student mosque mismatch';
  end if;

  select mosque_id into v_mosque_id
  from public.groups where id = new.group_id;
  if v_mosque_id is distinct from new.mosque_id then
    raise exception 'hifz_progress: group mosque mismatch';
  end if;

  return new;
end;
$$;

create trigger hifz_progress_mosque_invariant
before insert or update on public.hifz_progress
for each row execute function app.check_hifz_progress_mosque();

-- 3. RLS.
alter table public.hifz_progress enable row level security;

-- Admins have full access.
create policy "admin manage hifz_progress"
  on public.hifz_progress
  for all
  using  (app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'mosque_admin'));

-- Teachers can read and write progress for students in their groups.
create policy "teacher manage hifz_progress"
  on public.hifz_progress
  for all
  using  (app.is_teacher_of_group(group_id))
  with check (app.is_teacher_of_group(group_id));

-- Parents can read their own child's progress.
create policy "parent read hifz_progress"
  on public.hifz_progress
  for select
  using  (app.parent_has_student(student_profile_id));

-- 4. Register the plugin.
insert into public.plugin_registry (id, name, description, category, sort_order)
values (
  'quran_hifz',
  'Quran Hifz Tracker',
  'Track Hifz (memorisation) progress for students in Hifz groups. Mark any group category as Hifz to enable the page/juz tracker on group and student detail pages.',
  'education',
  15
)
on conflict (id) do nothing;

-- Activate the plugin for all existing mosques.
insert into public.mosque_plugins (mosque_id, plugin_id, is_active)
select m.id, 'quran_hifz', true
from public.mosques m
on conflict (mosque_id, plugin_id) do nothing;
