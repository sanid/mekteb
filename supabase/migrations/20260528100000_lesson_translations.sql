-- Lesson translations: per-locale title + body content.
-- The base lessons.title / lessons.body remain for admin list display
-- and as a fallback. Consumers should prefer the translation for the
-- active locale when one exists.

create table public.lesson_translations (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  locale text not null check (locale in ('de', 'en', 'bs', 'tr')),
  title text not null,
  body jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (lesson_id, locale)
);

create index lesson_translations_lesson_id_idx on public.lesson_translations (lesson_id);
create index lesson_translations_mosque_locale_idx on public.lesson_translations (mosque_id, locale);

create trigger set_updated_at
before update on public.lesson_translations
for each row execute function app.set_updated_at();

-- Ensure the translation belongs to the same mosque as the lesson.
create or replace function app.check_lesson_translation_mosque()
returns trigger
language plpgsql
as $$
declare
  lesson_mosque uuid;
begin
  select mosque_id into lesson_mosque from public.lessons where id = new.lesson_id;
  if lesson_mosque is distinct from new.mosque_id then
    raise exception 'lesson_translations: lesson must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger lesson_translations_mosque_check
before insert or update on public.lesson_translations
for each row execute function app.check_lesson_translation_mosque();

-- RLS: same rules as the parent lessons table.
alter table public.lesson_translations enable row level security;

-- Admins can do everything within their mosque.
create policy "admin full access"
  on public.lesson_translations
  for all
  using (app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'mosque_admin'));

-- Teachers can read translations for published lessons in their mosque.
create policy "teacher read published"
  on public.lesson_translations
  for select
  using (
    app.is_member(mosque_id)
    and app.has_role(mosque_id, 'teacher')
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published = true
    )
  );

-- Parents can read translations for published lessons in their mosque.
create policy "parent read published"
  on public.lesson_translations
  for select
  using (
    app.is_member(mosque_id)
    and app.has_role(mosque_id, 'parent')
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published = true
    )
  );

-- Students can read translations for published lessons in their mosque.
create policy "student read published"
  on public.lesson_translations
  for select
  using (
    app.is_member(mosque_id)
    and app.has_role(mosque_id, 'student')
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published = true
    )
  );
