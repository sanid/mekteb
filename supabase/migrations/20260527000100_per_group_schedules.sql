-- Move teaching schedule recurrence from CATEGORY-level to GROUP-level.
-- Existing category-keyed rows remain (legacy); new code uses group-keyed rows.

-- 1. teaching_schedules: add group_id, make category_id nullable, new partial uniques
alter table public.teaching_schedules
  add column group_id uuid references public.groups(id) on delete cascade;

alter table public.teaching_schedules
  alter column category_id drop not null;

-- Drop old composite unique constraint (auto-named "teaching_schedules_mosque_id_category_id_day_of_week_key")
alter table public.teaching_schedules
  drop constraint if exists teaching_schedules_mosque_id_category_id_day_of_week_key;

create unique index if not exists teaching_schedules_group_day_uniq
  on public.teaching_schedules (group_id, day_of_week)
  where group_id is not null;

create unique index if not exists teaching_schedules_category_day_uniq
  on public.teaching_schedules (mosque_id, category_id, day_of_week)
  where group_id is null and category_id is not null;

alter table public.teaching_schedules
  add constraint teaching_schedules_target_chk
  check ((group_id is null) <> (category_id is null));

create index if not exists teaching_schedules_group_id_idx
  on public.teaching_schedules (group_id) where group_id is not null;

-- 2. teaching_sessions: add group_id, make category_id nullable, new partial uniques
alter table public.teaching_sessions
  add column group_id uuid references public.groups(id) on delete cascade;

alter table public.teaching_sessions
  alter column category_id drop not null;

alter table public.teaching_sessions
  drop constraint if exists teaching_sessions_mosque_id_date_category_id_key;

create unique index if not exists teaching_sessions_group_date_uniq
  on public.teaching_sessions (group_id, date)
  where group_id is not null;

create unique index if not exists teaching_sessions_category_date_uniq
  on public.teaching_sessions (mosque_id, date, category_id)
  where group_id is null and category_id is not null;

alter table public.teaching_sessions
  add constraint teaching_sessions_target_chk
  check ((group_id is null) <> (category_id is null));

create index if not exists teaching_sessions_group_date_idx
  on public.teaching_sessions (group_id, date) where group_id is not null;
