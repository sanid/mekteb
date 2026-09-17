-- Personal Quran bookmarks with notes.
--
-- These are per-user, not per-mosque: a user keeps the same bookmarks across
-- any mosque they belong to, so the table is scoped by user_id (like profiles)
-- rather than carrying a mosque_id. RLS restricts every row to its owner.

create table public.quran_saved_ayahs (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  surah_number        integer     not null check (surah_number between 1 and 114),
  ayah_number         integer     not null check (ayah_number >= 1),
  surah_name          text        not null,
  arabic_text         text        not null,
  translation_text    text,
  translation_edition text,
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, surah_number, ayah_number)
);

create index quran_saved_ayahs_user_id_idx
  on public.quran_saved_ayahs (user_id, created_at desc);

create trigger set_updated_at
before update on public.quran_saved_ayahs
for each row execute function app.set_updated_at();

alter table public.quran_saved_ayahs enable row level security;

create policy "owner manages saved ayahs"
  on public.quran_saved_ayahs
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
