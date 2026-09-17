-- Language the original (untranslated) lesson texts are written in. Lessons
-- carry no language of their own, so the public library needs it to know
-- which languages it can offer: this one plus every translated locale.
alter table public.public_library_settings
  add column base_locale text check (base_locale in ('de', 'en', 'bs', 'tr'));
