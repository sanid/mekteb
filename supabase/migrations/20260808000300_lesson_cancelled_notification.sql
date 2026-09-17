-- Lesson-cancelled notifications.
--
-- When a teacher (or admin) marks a teaching_session as cancelled, every
-- enrolled student and their parents get a notification: the row goes into
-- notification_queue with a template key, so the inbox renders it in the
-- reader's language (web + mobile) and the email cron can pick it up.
--
-- Recipients are the group's active enrolments (students are users too, so
-- they are notified directly) plus each student's linked parents. The GDPR
-- admin notice is not involved. Users who opted out of `lesson_cancelled`
-- (via notification preferences) are skipped, like every other fanout type.

-- 1. Extend the notification type enum (guarded: ALTER TYPE has no IF NOT EXISTS)
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'notification_type' and e.enumlabel = 'lesson_cancelled'
  ) then
    alter type app.notification_type add value 'lesson_cancelled';
  end if;
end $$;

-- 2. The trigger function
create or replace function app.notify_lesson_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_name text;
  v_recipient  record;
begin
  -- Only the transition into cancelled, and only group-level sessions (the
  -- legacy category-level rows have no enrolment to fan out to).
  if not (NEW.is_cancelled and not OLD.is_cancelled) then
    return NEW;
  end if;
  if NEW.group_id is null then
    return NEW;
  end if;

  select name into v_group_name from public.groups where id = NEW.group_id;

  for v_recipient in
    -- Students enrolled in the group (students have their own auth users).
    select distinct sp.profile_id
    from public.group_enrollments ge
    join public.student_profiles sp on sp.id = ge.student_profile_id
    where ge.group_id = NEW.group_id
      and ge.is_active = true
    union
    -- Their parents.
    select distinct pp.profile_id
    from public.group_enrollments ge
    join public.parent_student_links psl
      on psl.student_profile_id = ge.student_profile_id
     and psl.mosque_id = NEW.mosque_id
    join public.parent_profiles pp on pp.id = psl.parent_profile_id
    where ge.group_id = NEW.group_id
      and ge.is_active = true
  loop
    if not app.notification_enabled(NEW.mosque_id, v_recipient.profile_id, 'lesson_cancelled') then
      continue;
    end if;

    insert into public.notification_queue (
      mosque_id, recipient_profile_id, channel, subject, body, status, is_read,
      template_key, template_params
    ) values (
      NEW.mosque_id, v_recipient.profile_id, 'email',
      'Lesson cancelled: ' || coalesce(v_group_name, 'your class'),
      coalesce(v_group_name, 'Your class')
        || ' is cancelled on ' || NEW.date::text
        || ' at ' || to_char(NEW.start_time, 'HH24:MI') || '.'
        || case when NEW.notes is not null and NEW.notes <> '' then ' Reason: ' || NEW.notes else '' end,
      'sent', false,
      'lesson.cancelled',
      jsonb_build_object(
        'group', v_group_name,
        'date', NEW.date,
        'startTime', to_char(NEW.start_time, 'HH24:MI'),
        'endTime', to_char(NEW.end_time, 'HH24:MI'),
        'notes', NEW.notes
      )
    );
  end loop;

  return NEW;
end;
$$;

revoke all on function app.notify_lesson_cancelled() from public;

drop trigger if exists trg_notify_lesson_cancelled on public.teaching_sessions;
create trigger trg_notify_lesson_cancelled
after update of is_cancelled on public.teaching_sessions
for each row execute function app.notify_lesson_cancelled();

grant execute on function app.notify_lesson_cancelled() to service_role;
