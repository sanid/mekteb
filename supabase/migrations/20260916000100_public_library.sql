-- Public lesson library.
--
-- A mosque can publish its lesson library on a public, login-free page
-- (/{locale}/library/{mosque slug}) and share the link. Only published
-- topics and lessons are shown. The page is rendered server-side with the
-- service-role client after checking `is_enabled`, so no anon RLS policy is
-- needed on lessons/topics — this table only stores the switch and the
-- page's styling.

create table public.public_library_settings (
  mosque_id uuid primary key references public.mosques(id) on delete cascade,
  is_enabled boolean not null default false,
  title text,
  intro text,
  accent_color text check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$'),
  font_style text not null default 'sans' check (font_style in ('sans', 'serif', 'rounded')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark', 'sepia')),
  show_logo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create trigger set_updated_at
before update on public.public_library_settings
for each row execute function app.set_updated_at();

alter table public.public_library_settings enable row level security;

create policy public_library_settings_select
  on public.public_library_settings for select
  to authenticated
  using (app.is_member(mosque_id) or app.is_platform_owner());

create policy public_library_settings_write
  on public.public_library_settings for all
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner())
  with check (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());

grant select, insert, update, delete on public.public_library_settings to authenticated;
