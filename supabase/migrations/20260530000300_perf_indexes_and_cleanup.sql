-- Performance: attendance_records student lookup
create index if not exists attendance_records_student_profile_id_idx
  on public.attendance_records (student_profile_id);

-- Performance: lesson_completions per-student within a mosque
create index if not exists lesson_completions_mosque_student_idx
  on public.lesson_completions (mosque_id, student_profile_id);

-- Performance: exam_sessions group+mosque+status composite
create index if not exists exam_sessions_mosque_group_status_idx
  on public.exam_sessions (mosque_id, from_group_id, status);

-- Drop dead mosque_settings table (never queried in application code)
drop table if exists public.mosque_settings;
