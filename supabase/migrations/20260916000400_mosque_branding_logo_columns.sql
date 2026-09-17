-- Production recorded 20260523000000_mosque_logos_bucket as applied but lacks
-- the two logo columns it adds (the file changed after it ran there), so every
-- branding save failed. Re-add them idempotently.
alter table public.mosque_branding
  add column if not exists logo_width int default 6,
  add column if not exists show_text_logo boolean default true;
