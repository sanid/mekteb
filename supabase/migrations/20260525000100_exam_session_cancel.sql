alter table public.exam_sessions
  drop constraint if exists exam_sessions_status_check;

alter table public.exam_sessions
  add constraint exam_sessions_status_check
  check (status in ('proposed','scheduled','in_progress','passed','failed','cancelled'));
