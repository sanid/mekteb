-- lesson-images: public bucket for images embedded in lesson bodies via BlockNote.
-- The bucket itself is public (reads need no policy), so we only add write policies.
-- Bucket is created by supabase/config.toml; these policies govern who can upload.

-- Mosque admins and teachers can insert images into their mosque's path.
-- Path convention: {mosque_id}/{lesson_id}/{filename}
create policy "lesson_images_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson-images'
    and (
      -- Platform owner can upload anywhere
      exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role = 'platform_owner'
          and is_active
      )
      or
      -- Mosque admin or teacher — path must start with their mosque_id
      exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role in ('mosque_admin', 'teacher')
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );

-- Allow owners to delete their mosque's images (admin/teacher).
create policy "lesson_images_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lesson-images'
    and (
      exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role = 'platform_owner'
          and is_active
      )
      or
      exists (
        select 1 from public.memberships
        where user_id = auth.uid()
          and role in ('mosque_admin', 'teacher')
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );
