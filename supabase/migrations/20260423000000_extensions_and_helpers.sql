-- Phase 0: extensions, schema conventions, and shared helper functions.
-- Every business table in later migrations relies on the helpers defined here
-- (set_updated_at trigger, app.current_mosque_id, app.has_role).

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create schema if not exists app;

-- Keeps updated_at fresh on every row update. Attach via:
--   create trigger set_updated_at before update on <table>
--   for each row execute function app.set_updated_at();
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enum of application roles scoped to a membership (user in a mosque).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app.app_role as enum ('platform_owner', 'mosque_admin', 'teacher', 'parent', 'student');
  end if;
end $$;
