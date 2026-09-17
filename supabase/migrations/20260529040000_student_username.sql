-- Add username column to student_profiles.
-- Username is the login handle for students who don't have an email address.
-- The auth email is generated internally as {username}@students.{mosque-slug}.mekteb.de
-- and is never shown to the student.

alter table public.student_profiles
  add column if not exists username text;

-- Enforce uniqueness per mosque, case-insensitive.
create unique index student_profiles_username_mosque_idx
  on public.student_profiles (mosque_id, lower(username))
  where username is not null;
