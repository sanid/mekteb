-- GDPR erasure log — kept permanently, NOT scoped to a mosque.
-- Records that a Right to Erasure (Art. 17) request was fulfilled.
-- Intentionally has no FK to mosques so it survives mosque deletion.

create table public.gdpr_deletion_log (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null,          -- the (now-deleted) mosque's ID
  mosque_name text not null,        -- name at time of deletion
  mosque_slug text not null,
  requested_by_email text not null, -- admin who triggered deletion
  deletion_started_at timestamptz not null default now(),
  deletion_completed_at timestamptz,
  stripe_customer_deleted boolean not null default false,
  storage_files_deleted integer not null default 0,
  notes text
);

-- Only platform owners may read this table.
alter table public.gdpr_deletion_log enable row level security;

create policy "platform owner read"
  on public.gdpr_deletion_log
  for all
  using (app.is_platform_owner())
  with check (app.is_platform_owner());
