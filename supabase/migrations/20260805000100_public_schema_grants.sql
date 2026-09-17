-- Restore the table grants `supabase db reset` no longer leaves behind.
--
-- Supabase's own bootstrap sets `alter default privileges` so that anything
-- `postgres` creates in `public` is usable by `anon`, `authenticated` and
-- `service_role`. On CLI 2.111 that default is not in place when the migrations
-- run, so every table this schema creates ends up owned by `postgres` with no
-- privileges for the API roles at all. The symptom is total: after a reset the
-- app answers "permission denied for table …" for every request and all 124
-- pgTAP tests fail at their first statement. Reproduced with the migration set
-- untouched, so it is a tooling change, not a schema regression.
--
-- Granting to `anon` looks alarming and is not: this is the standard Supabase
-- model, where **RLS is the security boundary and privileges are not**. The
-- assertion below is what makes that true rather than assumed — it refuses to
-- hand out privileges if any table in `public` has RLS switched off.
--
-- This migration is timestamped last so `grant … on all tables` covers
-- everything that already exists; the `alter default privileges` half is what
-- covers every table added after it.

do $$
declare
  unprotected text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into unprotected
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not c.relrowsecurity;

  if unprotected is not null then
    raise exception
      'Refusing to grant public-schema privileges: RLS is disabled on %. '
      'Every table in public must enable RLS before this migration can safely '
      'grant access to anon/authenticated (see AGENTS.md and MEMORY.md).',
      unprotected;
  end if;
end
$$;

-- Reaching the objects at all.
grant usage on schema public to anon, authenticated, service_role;

-- Existing objects.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- Objects created from here on. Unqualified, so it applies to the role running
-- the migrations (`postgres`) — the same role that creates every table here.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- Spelled out for `postgres` as well: if a later CLI runs migrations through a
-- different session role, the defaults attached above would not apply, and a
-- duplicate `alter default privileges` is a no-op rather than an error.
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;

-- The `app` schema holds no tables — only the authorization helpers, which are
-- security definer and already granted individually. Its usage grant is
-- restated because a missing one makes every one of those helpers unreachable,
-- and that failure reads as a broken RLS policy rather than a missing grant.
grant usage on schema app to anon, authenticated, service_role;
