-- Migration to add state column to mosques table
alter table public.mosques
add column state text not null default 'Berlin';
