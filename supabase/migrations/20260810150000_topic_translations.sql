-- Topic titles and descriptions per locale, mirroring `lesson_translations`.
-- The base `topics` row stays the fallback; consumers prefer the translation
-- for the active locale when one exists.

create table public.topic_translations (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  locale text not null check (locale in ('de', 'en', 'bs', 'tr')),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (topic_id, locale)
);

create index topic_translations_topic_id_idx on public.topic_translations (topic_id);
create index topic_translations_mosque_locale_idx on public.topic_translations (mosque_id, locale);

create trigger set_updated_at
before update on public.topic_translations
for each row execute function app.set_updated_at();

-- Ensure the translation belongs to the same mosque as the topic.
create or replace function app.check_topic_translation_mosque()
returns trigger
language plpgsql
as $$
declare
  topic_mosque uuid;
begin
  select mosque_id into topic_mosque from public.topics where id = new.topic_id;
  if topic_mosque is distinct from new.mosque_id then
    raise exception 'topic_translations: topic must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger topic_translations_mosque_check
before insert or update on public.topic_translations
for each row execute function app.check_topic_translation_mosque();

-- RLS: read rules mirror `topics_select` (members read published or
-- admin/teacher; students read published); write mirrors `topics_write`.
alter table public.topic_translations enable row level security;

create policy "admin full access"
  on public.topic_translations
  for all
  using (app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'mosque_admin'));

create policy "teacher full access"
  on public.topic_translations
  for all
  using (
    app.has_role(mosque_id, 'teacher')
    and exists (select 1 from public.topics t where t.id = topic_id)
  )
  with check (
    app.has_role(mosque_id, 'teacher')
    and exists (select 1 from public.topics t where t.id = topic_id)
  );

create policy "member read published"
  on public.topic_translations
  for select
  using (
    app.is_member(mosque_id)
    and exists (
      select 1 from public.topics t
      where t.id = topic_id
        and (t.is_published or app.has_role(mosque_id, 'mosque_admin') or app.has_role(mosque_id, 'teacher'))
    )
  );

create policy "student read published"
  on public.topic_translations
  for select
  using (
    app.is_student(mosque_id)
    and exists (select 1 from public.topics t where t.id = topic_id and t.is_published)
  );
