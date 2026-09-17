-- Mosque can declare which German Bundesland it sits in so the calendar
-- shows the right school holidays. Defaults to 'Berlin' to match the
-- previous hardcoded fallback.

alter table public.mosques
  add column if not exists state text default 'Berlin';
