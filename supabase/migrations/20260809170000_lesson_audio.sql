-- Lesson audio: one or more recordings per lesson, optionally per language.
--
-- A mosque school records the lesson text (or its translation) and attaches
-- the files to the lesson, so a student can listen instead of read. The same
-- lesson may carry several audio tracks — one per locale for the translation
-- tabs, plus tracks with `locale = NULL` that apply to every language. The
-- mobile app streams them with expo-audio (signed URLs, like
-- `lesson_resources`); the web portals upload and manage them.
--
-- The shape deliberately mirrors `lesson_resources` (mosque pinning trigger,
-- RLS shape, storage bucket) so the two attachment types behave identically.

create table public.lesson_audio (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  -- NULL = base audio for every language; otherwise the locale it translates.
  locale text check (locale in ('de', 'en', 'bs', 'tr')),
  title text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds real,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index lesson_audio_lesson_id_idx on public.lesson_audio (lesson_id);
create index lesson_audio_lesson_locale_idx on public.lesson_audio (lesson_id, locale);

create trigger set_updated_at
before update on public.lesson_audio
for each row execute function app.set_updated_at();

-- The audio must belong to the same mosque as its lesson (mirrors
-- check_lesson_resource_mosque).
create or replace function app.check_lesson_audio_mosque()
returns trigger
language plpgsql
as $$
declare
  lesson_mosque uuid;
begin
  select mosque_id into lesson_mosque from public.lessons where id = new.lesson_id;
  if lesson_mosque is distinct from new.mosque_id then
    raise exception 'lesson_audio: lesson must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger lesson_audio_mosque_check
before insert or update on public.lesson_audio
for each row execute function app.check_lesson_audio_mosque();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.lesson_audio enable row level security;

-- Read: any mosque member, plus students once the lesson is published
-- (identical to lesson_resources, which the 20260807000000 migration widened
-- for students).
create policy lesson_audio_select
  on public.lesson_audio for select
  to authenticated
  using (
    app.is_platform_owner()
    or app.is_member(mosque_id)
    or (
      app.is_student(mosque_id)
      and exists (
        select 1 from public.lessons l
        where l.id = lesson_audio.lesson_id and l.is_published
      )
    )
  );

-- Write: mosque admins and teachers (mirrors lesson_resources_write).
create policy lesson_audio_write
  on public.lesson_audio for all
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
    or app.is_platform_owner()
  )
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
    or app.is_platform_owner()
  );

grant select, insert, update, delete on public.lesson_audio to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, audio formats only, admin/teacher can write into
-- their mosque's path. Signed URLs serve the reads, exactly like
-- lesson-resources.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-audio',
  'lesson-audio',
  false,
  104857600, -- 100 MB — a full lesson recording can run long
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg']
) on conflict (id) do nothing;

update storage.buckets
set allowed_mime_types = array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg']
where id = 'lesson-audio';

create policy "lesson_audio_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson-audio'
    and (
      exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role = 'platform_owner'
          and is_active
      )
      or exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role in ('mosque_admin', 'teacher')
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );

create policy "lesson_audio_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lesson-audio'
    and (
      exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role = 'platform_owner'
          and is_active
      )
      or exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role in ('mosque_admin', 'teacher')
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );
