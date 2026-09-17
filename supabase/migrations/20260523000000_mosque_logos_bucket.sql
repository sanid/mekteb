insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mosque-logos',
  'mosque-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
) on conflict (id) do nothing;

alter table public.mosque_branding
  add column if not exists logo_width int default 6,
  add column if not exists show_text_logo boolean default true;

create policy "mosque_logos_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'mosque-logos'
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
          and role = 'mosque_admin'
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );

create policy "mosque_logos_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'mosque-logos'
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
          and role = 'mosque_admin'
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );

create policy "mosque_logos_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'mosque-logos'
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
          and role = 'mosque_admin'
          and is_active
          and (storage.objects.name like (mosque_id::text || '/%'))
      )
    )
  );
