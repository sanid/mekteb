-- Prayer times & Islamic calendar plugin.
--
-- Adds optional geo-coordinates + a calculation method to mosques so the app
-- can compute daily prayer times (client-side, no external API). The mosque's
-- existing `timezone` column is reused for local-time conversion.

alter table public.mosques
  add column if not exists latitude      numeric(8, 5),
  add column if not exists longitude     numeric(8, 5),
  add column if not exists prayer_method text not null default 'MWL';

-- Register the plugin so admins can toggle it like the others.
insert into public.plugin_registry (id, name, description, category, sort_order)
values (
  'prayer_times',
  'Prayer Times & Hijri Calendar',
  'Show daily prayer times and the Hijri date across the app. Set the mosque coordinates under Settings → General to enable.',
  'scheduling',
  20
)
on conflict (id) do nothing;

-- Activate for all existing mosques (the card still hides itself until
-- coordinates are configured, so this is safe to default on).
insert into public.mosque_plugins (mosque_id, plugin_id, is_active)
select m.id, 'prayer_times', true
from public.mosques m
on conflict (mosque_id, plugin_id) do nothing;
