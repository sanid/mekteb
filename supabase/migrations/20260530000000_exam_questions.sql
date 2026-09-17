-- Exam question bank for written test generation.
create table public.exam_questions (
  id         uuid    primary key default gen_random_uuid(),
  mosque_id  uuid    not null references public.mosques(id) on delete cascade,
  topic_id   uuid    references public.topics(id) on delete set null,
  question_text text not null check (char_length(question_text) >= 5),
  difficulty text    not null default 'medium'
                     check (difficulty in ('easy', 'medium', 'hard')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid    references auth.users(id),
  updated_by uuid    references auth.users(id)
);

create index exam_questions_mosque_idx  on public.exam_questions (mosque_id);
create index exam_questions_topic_idx   on public.exam_questions (mosque_id, topic_id);
create index exam_questions_active_idx  on public.exam_questions (mosque_id, is_active)
  where is_active = true;

create trigger set_updated_at
  before update on public.exam_questions
  for each row execute function app.set_updated_at();

alter table public.exam_questions enable row level security;

-- Examiners can read active questions in their mosque.
create policy "exam_questions_examiner_select" on public.exam_questions
  for select to authenticated
  using (
    is_active = true
    and app.has_role(mosque_id, 'examiner')
  );

-- Admins have full access (including inactive questions for management).
create policy "exam_questions_admin_all" on public.exam_questions
  for all to authenticated
  using  (app.has_role(mosque_id, 'mosque_admin'))
  with check (app.has_role(mosque_id, 'mosque_admin'));
