-- Phase 2: lesson content.
-- Topics group lessons (e.g. "Tajweed basics"). Lessons belong to topics
-- and can be referenced by homework. Resources are attachments stored in
-- Supabase Storage; we only keep metadata + path here.

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index topics_mosque_id_idx on public.topics (mosque_id);
create index topics_mosque_sort_idx on public.topics (mosque_id, sort_order);

create trigger set_updated_at
before update on public.topics
for each row execute function app.set_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  body text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index lessons_mosque_id_idx on public.lessons (mosque_id);
create index lessons_topic_id_idx on public.lessons (topic_id);
create index lessons_mosque_topic_sort_idx
  on public.lessons (mosque_id, topic_id, sort_order);

create trigger set_updated_at
before update on public.lessons
for each row execute function app.set_updated_at();

-- Keep topic and lesson in the same mosque when both are set.
create or replace function app.check_lesson_topic_mosque()
returns trigger
language plpgsql
as $$
declare
  topic_mosque uuid;
begin
  if new.topic_id is null then
    return new;
  end if;
  select mosque_id into topic_mosque from public.topics where id = new.topic_id;
  if topic_mosque is distinct from new.mosque_id then
    raise exception 'lessons: topic must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger lessons_topic_mosque_check
before insert or update on public.lessons
for each row execute function app.check_lesson_topic_mosque();

-- Files attached to a lesson. `storage_path` is the object path inside the
-- 'lesson-resources' storage bucket (created in a later migration).
create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index lesson_resources_lesson_id_idx on public.lesson_resources (lesson_id);
create index lesson_resources_mosque_id_idx on public.lesson_resources (mosque_id);

create trigger set_updated_at
before update on public.lesson_resources
for each row execute function app.set_updated_at();

create or replace function app.check_lesson_resource_mosque()
returns trigger
language plpgsql
as $$
declare
  lesson_mosque uuid;
begin
  select mosque_id into lesson_mosque from public.lessons where id = new.lesson_id;
  if lesson_mosque is distinct from new.mosque_id then
    raise exception 'lesson_resources: lesson must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger lesson_resources_mosque_check
before insert or update on public.lesson_resources
for each row execute function app.check_lesson_resource_mosque();
