-- Deep-review hardening (2026-08-17):
--
-- 1. pg_net must exist for the push webhook trigger; an unguarded trigger
--    that errors on every notification_queue insert would break ALL fanout
--    paths (messages, announcements, homework, absences), not just push.
-- 2. The push trigger itself must be resilient: a pg_net outage or missing
--    config must never roll back the notification insert it fires after.
-- 3. Cross-mosque invariant triggers for link tables that shipped without
--    them (the pattern every other link table has).
-- 4. Indexes on filtered/joined columns that were missing.
-- 5. Platform owner read on mosque_plugins (they read everything else).

-- ── 1. pg_net extension ─────────────────────────────────────────────────────

create extension if not exists pg_net;

-- ── 2. Resilient push webhook trigger ───────────────────────────────────────

create or replace function app.notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config app.push_webhook_config%rowtype;
begin
  select * into v_config from app.push_webhook_config limit 1;
  if v_config is null or v_config.url = '' or v_config.secret = '' then
    return new;
  end if;

  begin
    perform net.http_post(
      v_config.url,
      jsonb_build_object('notificationId', new.id),
      '{}'::jsonb,
      jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_config.secret
      ),
      30000
    );
  exception when others then
    -- Push is an enhancement; a webhook failure must never roll back the
    -- notification row. The cron backstop (send-push) picks it up later.
    null;
  end;

  return new;
end;
$$;

-- ── 3. Cross-mosque invariant triggers ──────────────────────────────────────
-- The pattern mirrors check_group_enrollment_mosque (20260423010100):
-- a link row's mosque_id must equal every FK target's mosque_id, or the
-- insert/update is rejected.

create or replace function app.check_teaching_schedule_mosque()
returns trigger
language plpgsql
as $$
declare
  category_mosque uuid;
  group_mosque uuid;
begin
  -- Per-group schedules carry group_id and a NULL category; category-level
  -- ones the reverse (check constraint teaching_schedules_target_chk).
  if new.category_id is not null then
    select mosque_id into category_mosque from public.group_categories where id = new.category_id;
    if category_mosque is distinct from new.mosque_id then
      raise exception 'teaching_schedules: mosque_id must match category mosque';
    end if;
  end if;
  if new.group_id is not null then
    select mosque_id into group_mosque from public.groups where id = new.group_id;
    if group_mosque is distinct from new.mosque_id then
      raise exception 'teaching_schedules: mosque_id must match group mosque';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists teaching_schedules_mosque_check on public.teaching_schedules;
create trigger teaching_schedules_mosque_check
before insert or update on public.teaching_schedules
for each row execute function app.check_teaching_schedule_mosque();

create or replace function app.check_teaching_session_mosque()
returns trigger
language plpgsql
as $$
declare
  category_mosque uuid;
  group_mosque uuid;
begin
  -- Per-group sessions carry group_id and a NULL category; category-level
  -- ones the reverse (check constraint teaching_sessions_target_chk).
  if new.category_id is not null then
    select mosque_id into category_mosque from public.group_categories where id = new.category_id;
    if category_mosque is distinct from new.mosque_id then
      raise exception 'teaching_sessions: mosque_id must match category mosque';
    end if;
  end if;
  if new.group_id is not null then
    select mosque_id into group_mosque from public.groups where id = new.group_id;
    if group_mosque is distinct from new.mosque_id then
      raise exception 'teaching_sessions: mosque_id must match group mosque';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists teaching_sessions_mosque_check on public.teaching_sessions;
create trigger teaching_sessions_mosque_check
before insert or update on public.teaching_sessions
for each row execute function app.check_teaching_session_mosque();

create or replace function app.check_group_category_mosque()
returns trigger
language plpgsql
as $$
declare
  category_mosque uuid;
begin
  if new.category_id is not null then
    select mosque_id into category_mosque from public.group_categories where id = new.category_id;
    if category_mosque is distinct from new.mosque_id then
      raise exception 'groups: category must belong to the group''s mosque';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_category_mosque_check on public.groups;
create trigger groups_category_mosque_check
before insert or update on public.groups
for each row execute function app.check_group_category_mosque();

create or replace function app.check_lesson_completion_mosque()
returns trigger
language plpgsql
as $$
declare
  student_mosque uuid;
  lesson_mosque uuid;
begin
  select mosque_id into student_mosque from public.student_profiles where id = new.student_profile_id;
  select mosque_id into lesson_mosque from public.lessons where id = new.lesson_id;
  if student_mosque is distinct from new.mosque_id
     or lesson_mosque is distinct from new.mosque_id then
    raise exception 'lesson_completions: mosque_id must match both student and lesson mosques';
  end if;
  return new;
end;
$$;

drop trigger if exists lesson_completions_mosque_check on public.lesson_completions;
create trigger lesson_completions_mosque_check
before insert or update on public.lesson_completions
for each row execute function app.check_lesson_completion_mosque();

create or replace function app.check_exam_question_mosque()
returns trigger
language plpgsql
as $$
declare
  topic_mosque uuid;
begin
  if new.topic_id is not null then
    select mosque_id into topic_mosque from public.topics where id = new.topic_id;
    if topic_mosque is distinct from new.mosque_id then
      raise exception 'exam_questions: topic must belong to the question''s mosque';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists exam_questions_topic_mosque_check on public.exam_questions;
create trigger exam_questions_topic_mosque_check
before insert or update on public.exam_questions
for each row execute function app.check_exam_question_mosque();

create or replace function app.check_written_test_mosque()
returns trigger
language plpgsql
as $$
declare
  session_mosque uuid;
  examiner_mosque uuid;
begin
  if new.exam_session_id is not null then
    select mosque_id into session_mosque from public.exam_sessions where id = new.exam_session_id;
    if session_mosque is distinct from new.mosque_id then
      raise exception 'written_tests: exam_session must belong to the test''s mosque';
    end if;
  end if;
  select mosque_id into examiner_mosque from public.teacher_profiles where id = new.examiner_profile_id;
  if examiner_mosque is distinct from new.mosque_id then
    raise exception 'written_tests: examiner must belong to the test''s mosque';
  end if;
  return new;
end;
$$;

drop trigger if exists written_tests_mosque_check on public.written_tests;
create trigger written_tests_mosque_check
before insert or update on public.written_tests
for each row execute function app.check_written_test_mosque();

create or replace function app.check_written_test_answer_mosque()
returns trigger
language plpgsql
as $$
declare
  test_mosque uuid;
  question_mosque uuid;
begin
  select mosque_id into test_mosque from public.written_tests where id = new.written_test_id;
  select mosque_id into question_mosque from public.exam_questions where id = new.question_id;
  if test_mosque is distinct from new.mosque_id
     or question_mosque is distinct from new.mosque_id then
    raise exception 'written_test_answers: mosque_id must match both test and question mosques';
  end if;
  return new;
end;
$$;

drop trigger if exists written_test_answers_mosque_check on public.written_test_answers;
create trigger written_test_answers_mosque_check
before insert or update on public.written_test_answers
for each row execute function app.check_written_test_answer_mosque();

-- ── 4. Missing indexes ──────────────────────────────────────────────────────

create index if not exists progress_notes_group_idx
  on public.progress_notes (group_id);

create index if not exists notification_queue_source_message_idx
  on public.notification_queue (source_message_id);

create index if not exists notification_queue_source_announcement_idx
  on public.notification_queue (source_announcement_id);

create index if not exists written_tests_examiner_idx
  on public.written_tests (examiner_profile_id);

-- ── 5. Platform owner read on mosque_plugins ────────────────────────────────
-- The original policy (20260807000000) already granted students access via
-- app.is_student; this only adds the platform-owner branch.

drop policy if exists "member read active plugins" on public.mosque_plugins;
create policy "member read active plugins"
  on public.mosque_plugins
  for select
  using (app.is_member(mosque_id) or app.is_student(mosque_id) or app.is_platform_owner());
