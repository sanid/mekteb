-- Assistants behave like teachers (deep-review follow-up, 2026-08-17).
--
-- 20260528000100 added the 'assistant' role with the claim "no new
-- permissions or RLS policies needed", but every education write policy
-- gates on app.has_role(mosque_id, 'teacher') — and an assistant holds the
-- 'assistant' membership, not 'teacher' (the seed creates assistant-only
-- users with a teacher_profile but no teacher membership). The result was
-- half a teacher's surface: group-scoped helpers (profile-based) allowed
-- attendance/homework, while lesson/topic/resource/translation/audio writes
-- and announcements were silently denied.
--
-- Fix: one shared staff helper (teacher OR assistant) used everywhere a
-- teacher membership previously meant "staff member".

create or replace function app.is_staff(target_mosque uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.mosque_id = target_mosque
      and m.role in ('teacher', 'assistant')
      and m.is_active
  );
$$;

revoke all on function app.is_staff(uuid) from public;
grant execute on function app.is_staff(uuid) to authenticated;

-- ── topics / lessons / lesson_resources (20260423020400) ───────────────────

drop policy if exists topics_write on public.topics;
create policy topics_write
  on public.topics for all
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
    or app.is_platform_owner()
  )
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
    or app.is_platform_owner()
  );

drop policy if exists topics_select on public.topics;
create policy topics_select
  on public.topics for select
  to authenticated
  using (
    app.is_platform_owner()
    or (app.is_member(mosque_id) and (is_published or app.is_staff(mosque_id)))
    or (app.is_student(mosque_id) and is_published)
  );

drop policy if exists lessons_write on public.lessons;
create policy lessons_write
  on public.lessons for all
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
    or app.is_platform_owner()
  )
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
    or app.is_platform_owner()
  );

drop policy if exists lessons_select on public.lessons;
create policy lessons_select
  on public.lessons for select
  to authenticated
  using (
    app.is_platform_owner()
    or (app.is_member(mosque_id) and (is_published or app.is_staff(mosque_id)))
    or (app.is_student(mosque_id) and is_published)
  );

drop policy if exists lesson_resources_write on public.lesson_resources;
create policy lesson_resources_write
  on public.lesson_resources for all
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
    or app.is_platform_owner()
  )
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
    or app.is_platform_owner()
  );

-- ── lesson_translations (20260528100000 + 20260809160000) ───────────────────

drop policy if exists "teacher read published" on public.lesson_translations;
create policy "teacher read published"
  on public.lesson_translations
  for select
  using (
    app.is_member(mosque_id)
    and app.is_staff(mosque_id)
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published = true
    )
  );

drop policy if exists "teacher write translations" on public.lesson_translations;
create policy "teacher write translations"
  on public.lesson_translations for all
  to authenticated
  using (app.is_staff(mosque_id))
  with check (app.is_staff(mosque_id));

-- ── topic_translations (20260810150000) ─────────────────────────────────────

drop policy if exists "teacher full access" on public.topic_translations;
create policy "teacher full access"
  on public.topic_translations
  for all
  using (
    app.is_staff(mosque_id)
    and exists (select 1 from public.topics t where t.id = topic_id)
  )
  with check (
    app.is_staff(mosque_id)
    and exists (select 1 from public.topics t where t.id = topic_id)
  );

drop policy if exists "member read published" on public.topic_translations;
create policy "member read published"
  on public.topic_translations
  for select
  using (
    app.is_member(mosque_id)
    and exists (
      select 1 from public.topics t
      where t.id = topic_id
        and (t.is_published or app.has_role(mosque_id, 'mosque_admin') or app.is_staff(mosque_id))
    )
  );

-- ── lesson_audio (20260809170000) ───────────────────────────────────────────

drop policy if exists lesson_audio_write on public.lesson_audio;
create policy lesson_audio_write
  on public.lesson_audio for all
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
    or app.is_platform_owner()
  )
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
    or app.is_platform_owner()
  );

-- ── announcements (20260424000000) ──────────────────────────────────────────

drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert
  on public.announcements for insert
  to authenticated
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_staff(mosque_id)
  );

drop policy if exists announcements_update on public.announcements;
create policy announcements_update
  on public.announcements for update
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or (
      app.is_staff(mosque_id)
      and author_profile_id = auth.uid()
    )
  );

-- ── student_profiles (20260427000003) ───────────────────────────────────────

drop policy if exists student_profiles_select on public.student_profiles;
create policy student_profiles_select
  on public.student_profiles for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or profile_id = auth.uid()
    or exists (
      select 1 from public.parent_student_links psl
      where psl.student_profile_id = student_profiles.id
        and psl.parent_profile_id in (
          select app.current_parent_profile_ids(student_profiles.mosque_id)
        )
    )
    -- Staff (teachers AND assistants) may read all student profiles in the
    -- mosque. Role check keeps it recursion-free, as before.
    or app.is_staff(mosque_id)
  );

-- ── Storage: lesson-images (20260428000000), lesson-audio (20260809170000) ─
-- Staff may write into their mosque's storage path.

drop policy if exists "lesson_images_insert" on storage.objects;
create policy "lesson_images_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson-images'
    and exists (
      select 1 from public.memberships
      where user_id = auth.uid()
        and role = 'platform_owner'
        and is_active
    )
    or (
      bucket_id = 'lesson-images'
      and exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role in ('mosque_admin', 'teacher', 'assistant')
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );

drop policy if exists "lesson_images_delete" on storage.objects;
create policy "lesson_images_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lesson-images'
    and exists (
      select 1 from public.memberships
      where user_id = auth.uid()
        and role = 'platform_owner'
        and is_active
    )
    or (
      bucket_id = 'lesson-images'
      and exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role in ('mosque_admin', 'teacher', 'assistant')
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );

drop policy if exists "lesson_audio_insert" on storage.objects;
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
          and role in ('mosque_admin', 'teacher', 'assistant')
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );

drop policy if exists "lesson_audio_delete" on storage.objects;
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
          and role in ('mosque_admin', 'teacher', 'assistant')
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );
