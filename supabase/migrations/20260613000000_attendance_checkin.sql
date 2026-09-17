-- QR self-check-in for attendance.
--
-- A teacher opens check-in for a session, which mints a rotating token and
-- displays it as a QR code. Students (or their parents) scan it and mark the
-- student present. The token is a capability: the check-in page verifies it is
-- active server-side, confirms the scanner is enrolled / a parent of an
-- enrolled student, then writes the attendance record with the service role
-- (parents/students have no RLS write path to attendance).

alter table public.attendance_sessions
  add column if not exists checkin_token     uuid,
  add column if not exists checkin_active     boolean     not null default false,
  add column if not exists checkin_opened_at  timestamptz;

create unique index if not exists attendance_sessions_checkin_token_idx
  on public.attendance_sessions (checkin_token)
  where checkin_token is not null;
