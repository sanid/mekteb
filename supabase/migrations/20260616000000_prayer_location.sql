-- Switch prayer-time configuration from raw coordinates to a free-text
-- location, which is geocoded by the AlAdhan API on each request.

alter table public.mosques
  add column if not exists prayer_location text;

comment on column public.mosques.prayer_location is
  'Free-text location (e.g. "Berlin, Germany") sent to the AlAdhan API to resolve prayer times.';

update public.plugin_registry
set description = 'Show daily prayer times and the Hijri date across the app. Set the mosque location under Settings → General to enable.'
where id = 'prayer_times';
