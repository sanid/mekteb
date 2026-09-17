-- Create diploma templates table
create table if not exists public.diploma_templates (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  name text not null,
  orientation text not null default 'landscape', -- 'portrait' | 'landscape'
  background_image_url text, -- optional background image path
  elements jsonb not null default '[]'::jsonb, -- array of canvas elements (text, images, svgs)
  is_active boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.diploma_templates enable row level security;

-- RLS policies for diploma templates
create policy "diploma_templates_select"
  on public.diploma_templates for select
  to authenticated
  using (
    mosque_id in (
      select mosque_id from public.memberships
      where user_id = auth.uid() and is_active
    )
  );

create policy "diploma_templates_insert"
  on public.diploma_templates for insert
  to authenticated
  with check (
    mosque_id in (
      select mosque_id from public.memberships
      where user_id = auth.uid() and role = 'mosque_admin' and is_active
    )
  );

create policy "diploma_templates_update"
  on public.diploma_templates for update
  to authenticated
  using (
    mosque_id in (
      select mosque_id from public.memberships
      where user_id = auth.uid() and role = 'mosque_admin' and is_active
    )
  )
  with check (
    mosque_id in (
      select mosque_id from public.memberships
      where user_id = auth.uid() and role = 'mosque_admin' and is_active
    )
  );

create policy "diploma_templates_delete"
  on public.diploma_templates for delete
  to authenticated
  using (
    mosque_id in (
      select mosque_id from public.memberships
      where user_id = auth.uid() and role = 'mosque_admin' and is_active
    )
  );

-- Create storage bucket for diploma assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diploma-assets',
  'diploma-assets',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
) on conflict (id) do nothing;

create policy "diploma_assets_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'diploma-assets'
    and exists (
      select 1 from public.memberships
      where user_id = auth.uid()
        and role = 'mosque_admin'
        and is_active
        and (storage.objects.name like (mosque_id::text || '/%'))
    )
  );

create policy "diploma_assets_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'diploma-assets'
    and exists (
      select 1 from public.memberships
      where user_id = auth.uid()
        and role = 'mosque_admin'
        and is_active
        and (storage.objects.name like (mosque_id::text || '/%'))
    )
  );

create policy "diploma_assets_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'diploma-assets'
    and exists (
      select 1 from public.memberships
      where user_id = auth.uid()
        and role = 'mosque_admin'
        and is_active
        and (storage.objects.name like (mosque_id::text || '/%'))
    )
  );
