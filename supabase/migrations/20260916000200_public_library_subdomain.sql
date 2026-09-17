-- Public library on its own subdomain, e.g. ilmihal-ikb.mekteb.de.
--
-- {mosque slug}.mekteb.de is already the mosque's portal, so the library
-- subdomain lives in the same namespace and must never collide with a
-- mosque slug (enforced both ways by triggers below).

alter table public.public_library_settings
  add column subdomain text unique
  check (
    subdomain is null
    or (
      subdomain ~ '^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$'
      and subdomain not in ('www', 'app', 'api', 'admin', 'mail', 'docs', 'status', 'library', 'static', 'cdn')
    )
  );

create or replace function app.check_library_subdomain_free()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if new.subdomain is not null
     and exists (select 1 from public.mosques where slug = new.subdomain) then
    raise exception 'public_library_settings: subdomain is taken by a mosque'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger public_library_subdomain_free
before insert or update of subdomain on public.public_library_settings
for each row execute function app.check_library_subdomain_free();

create or replace function app.check_mosque_slug_not_library()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if exists (
    select 1 from public.public_library_settings
    where subdomain = new.slug and mosque_id <> new.id
  ) then
    raise exception 'mosques: slug is taken by a public library'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger mosque_slug_not_library
before insert or update of slug on public.mosques
for each row execute function app.check_mosque_slug_not_library();

-- Host → mosque slug lookup for the proxy, which runs before any login.
-- Returns only the slug of an *enabled* library, nothing else.
create or replace function public.resolve_library_subdomain(p_subdomain text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.slug
  from public.public_library_settings s
  join public.mosques m on m.id = s.mosque_id
  where s.subdomain = lower(p_subdomain)
    and s.is_enabled
  limit 1;
$$;

revoke all on function public.resolve_library_subdomain(text) from public;
grant execute on function public.resolve_library_subdomain(text) to anon, authenticated;
