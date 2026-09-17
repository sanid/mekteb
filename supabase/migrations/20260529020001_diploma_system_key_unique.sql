-- Deduplicate any rows seeded before this constraint existed,
-- keeping only the most recently created row per (mosque_id, system_key).
delete from public.diploma_templates a
using public.diploma_templates b
where a.system_key is not null
  and a.mosque_id = b.mosque_id
  and a.system_key = b.system_key
  and a.created_at < b.created_at;

-- Now safe to add the unique constraint.
alter table public.diploma_templates
  add constraint diploma_templates_mosque_system_key_unique
  unique (mosque_id, system_key);
