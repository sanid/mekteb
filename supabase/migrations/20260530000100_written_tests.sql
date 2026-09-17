-- Online written tests linked to exam sessions.
-- Flow: examiner creates test → student fills via token URL → examiner grades → exam_session.written_passed updated.

create table public.written_tests (
  id                  uuid    primary key default gen_random_uuid(),
  mosque_id           uuid    not null references public.mosques(id) on delete cascade,
  exam_session_id     uuid    references public.exam_sessions(id) on delete set null,
  examiner_profile_id uuid    not null references public.teacher_profiles(id),
  student_profile_id  uuid    not null references public.student_profiles(id),
  title               text    not null,
  question_ids        uuid[]  not null,
  token               text    not null unique default replace(gen_random_uuid()::text, '-', ''),
  status              text    not null default 'pending'
                              check (status in ('pending', 'submitted', 'graded')),
  submitted_at        timestamptz,
  graded_at           timestamptz,
  overall_result      text    check (overall_result in ('passed', 'failed')),
  examiner_note       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid    references auth.users(id),
  updated_by          uuid    references auth.users(id)
);

create index written_tests_mosque_idx   on public.written_tests (mosque_id);
create index written_tests_session_idx  on public.written_tests (exam_session_id);
create index written_tests_student_idx  on public.written_tests (student_profile_id);
create index written_tests_token_idx    on public.written_tests (token);
create index written_tests_status_idx   on public.written_tests (mosque_id, status);

create trigger set_updated_at
  before update on public.written_tests
  for each row execute function app.set_updated_at();

-- Answers: one row per question, created on student submission.
create table public.written_test_answers (
  id               uuid    primary key default gen_random_uuid(),
  mosque_id        uuid    not null references public.mosques(id) on delete cascade,
  written_test_id  uuid    not null references public.written_tests(id) on delete cascade,
  question_id      uuid    not null references public.exam_questions(id),
  question_order   int     not null,
  answer_text      text,
  examiner_comment text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (written_test_id, question_id)
);

create index written_test_answers_test_idx on public.written_test_answers (written_test_id);

create trigger set_updated_at
  before update on public.written_test_answers
  for each row execute function app.set_updated_at();

-- RLS -----------------------------------------------------------------------

alter table public.written_tests enable row level security;
alter table public.written_test_answers enable row level security;

-- Examiners: full access to tests they created
create policy "written_tests_examiner"
  on public.written_tests for all to authenticated
  using  (app.has_role(mosque_id, 'examiner') or app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'examiner') or app.has_role(mosque_id, 'mosque_admin'));

create policy "written_test_answers_examiner"
  on public.written_test_answers for all to authenticated
  using  (app.has_role(mosque_id, 'examiner') or app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'examiner') or app.has_role(mosque_id, 'mosque_admin'));
