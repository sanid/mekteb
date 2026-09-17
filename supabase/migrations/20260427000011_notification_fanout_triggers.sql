-- Notification fanout via PostgreSQL triggers.
--
-- Whenever a relevant event occurs, a row is inserted into notification_queue
-- for each affected user.  The UI inbox reads notification_queue directly, so
-- these notifications appear immediately.  status = 'sent' means "delivered to
-- in-app inbox".  An external Edge Function can later pick up 'pending' rows
-- for email/push delivery.
--
-- Events handled:
--   1. messages INSERT       → notify other thread participants
--   2. announcements INSERT/UPDATE (is_published becomes true) → notify members
--   3. homework_assignments INSERT (is_published=true) → notify parents of students
--   4. attendance_records INSERT where status='absent' → notify parents

-- ---------------------------------------------------------------------------
-- 1. New message → notify thread participants (except sender)
-- ---------------------------------------------------------------------------

create or replace function app.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mosque_id   uuid;
  v_subject     text;
  v_sender_name text;
  v_participant record;
begin
  select mosque_id, subject
    into v_mosque_id, v_subject
  from public.message_threads
  where id = NEW.thread_id;

  select coalesce(display_name, full_name)
    into v_sender_name
  from public.profiles
  where id = NEW.sender_profile_id;

  for v_participant in
    select mp.profile_id
    from public.message_participants mp
    where mp.thread_id = NEW.thread_id
      and mp.profile_id <> NEW.sender_profile_id
  loop
    insert into public.notification_queue (
      mosque_id,
      recipient_profile_id,
      channel,
      subject,
      body,
      status,
      is_read,
      source_message_id
    ) values (
      v_mosque_id,
      v_participant.profile_id,
      'email',
      coalesce(v_subject, 'New message'),
      coalesce(v_sender_name, 'Someone') || ' sent you a new message.',
      'sent',
      false,
      NEW.id
    );
  end loop;

  return NEW;
end;
$$;

revoke all on function app.notify_new_message() from public;

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
after insert on public.messages
for each row execute function app.notify_new_message();

-- ---------------------------------------------------------------------------
-- 2. Announcement published → notify mosque / group members
-- ---------------------------------------------------------------------------

create or replace function app.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
begin
  -- Only fire when is_published transitions to true
  if (TG_OP = 'INSERT' and not NEW.is_published) then
    return NEW;
  end if;
  if (TG_OP = 'UPDATE' and (OLD.is_published or not NEW.is_published)) then
    return NEW;
  end if;

  if NEW.audience = 'mosque' then
    -- Notify all active members of this mosque
    for v_recipient in
      select m.user_id as profile_id
      from public.memberships m
      where m.mosque_id = NEW.mosque_id
        and m.is_active
        and m.user_id <> NEW.created_by
    loop
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body,
        status, is_read, source_announcement_id
      ) values (
        NEW.mosque_id,
        v_recipient.profile_id,
        'email',
        NEW.title,
        left(NEW.body, 200),
        'sent',
        false,
        NEW.id
      );
    end loop;
  else
    -- Group announcement: notify enrolled students' parents + assigned teachers
    for v_recipient in
      select distinct psl.parent_profile_id as profile_id
      from public.group_enrollments ge
      join public.parent_student_links psl
        on psl.student_profile_id = ge.student_profile_id
        and psl.mosque_id = NEW.mosque_id
      where ge.group_id = NEW.group_id
        and ge.is_active = true
      union
      select tgl.teacher_profile_id as profile_id
      from public.teacher_group_links tgl
      where tgl.group_id = NEW.group_id
        and tgl.is_active = true
    loop
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body,
        status, is_read, source_announcement_id
      ) values (
        NEW.mosque_id,
        v_recipient.profile_id,
        'email',
        NEW.title,
        left(NEW.body, 200),
        'sent',
        false,
        NEW.id
      );
    end loop;
  end if;

  return NEW;
end;
$$;

revoke all on function app.notify_announcement_published() from public;

drop trigger if exists trg_notify_announcement on public.announcements;
create trigger trg_notify_announcement
after insert or update of is_published on public.announcements
for each row execute function app.notify_announcement_published();

-- ---------------------------------------------------------------------------
-- 3. Homework assigned (is_published=true) → notify parents of enrolled students
-- ---------------------------------------------------------------------------

create or replace function app.notify_homework_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_name  text;
  v_recipient   record;
begin
  -- Only fire when is_published transitions to true
  if (TG_OP = 'INSERT' and not NEW.is_published) then
    return NEW;
  end if;
  if (TG_OP = 'UPDATE' and (OLD.is_published or not NEW.is_published)) then
    return NEW;
  end if;

  select name into v_group_name from public.groups where id = NEW.group_id;

  if NEW.audience = 'group' then
    -- All parents of actively enrolled students in this group
    for v_recipient in
      select distinct psl.parent_profile_id as profile_id
      from public.group_enrollments ge
      join public.parent_student_links psl
        on psl.student_profile_id = ge.student_profile_id
        and psl.mosque_id = NEW.mosque_id
      where ge.group_id = NEW.group_id
        and ge.is_active = true
    loop
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body,
        status, is_read
      ) values (
        NEW.mosque_id,
        v_recipient.profile_id,
        'email',
        'New homework: ' || NEW.title,
        'New homework has been assigned in ' || coalesce(v_group_name, 'your class') || ': ' || NEW.title ||
          case when NEW.due_date is not null then ' (due ' || NEW.due_date::text || ')' else '' end,
        'sent',
        false
      );
    end loop;
  else
    -- Individual homework: parents of specifically targeted students
    for v_recipient in
      select distinct psl.parent_profile_id as profile_id
      from public.homework_targets ht
      join public.parent_student_links psl
        on psl.student_profile_id = ht.student_profile_id
        and psl.mosque_id = NEW.mosque_id
      where ht.homework_id = NEW.id
    loop
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body,
        status, is_read
      ) values (
        NEW.mosque_id,
        v_recipient.profile_id,
        'email',
        'New homework: ' || NEW.title,
        'New homework has been assigned in ' || coalesce(v_group_name, 'your class') || ': ' || NEW.title ||
          case when NEW.due_date is not null then ' (due ' || NEW.due_date::text || ')' else '' end,
        'sent',
        false
      );
    end loop;
  end if;

  return NEW;
end;
$$;

revoke all on function app.notify_homework_published() from public;

drop trigger if exists trg_notify_homework on public.homework_assignments;
create trigger trg_notify_homework
after insert or update of is_published on public.homework_assignments
for each row execute function app.notify_homework_published();

-- ---------------------------------------------------------------------------
-- 4. Attendance marked absent → notify parents
-- ---------------------------------------------------------------------------

create or replace function app.notify_attendance_absent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_name text;
  v_group_name   text;
  v_session_date date;
  v_recipient    record;
begin
  if NEW.status <> 'absent' then
    return NEW;
  end if;

  select sp.full_name into v_student_name
  from public.student_profiles sp
  where sp.id = NEW.student_profile_id;

  select g.name, s.session_date
    into v_group_name, v_session_date
  from public.attendance_sessions s
  join public.groups g on g.id = s.group_id
  where s.id = NEW.session_id;

  for v_recipient in
    select psl.parent_profile_id as profile_id
    from public.parent_student_links psl
    where psl.student_profile_id = NEW.student_profile_id
      and psl.mosque_id = NEW.mosque_id
  loop
    insert into public.notification_queue (
      mosque_id, recipient_profile_id, channel, subject, body,
      status, is_read
    ) values (
      NEW.mosque_id,
      v_recipient.profile_id,
      'email',
      coalesce(v_student_name, 'Your child') || ' was absent',
      coalesce(v_student_name, 'Your child') || ' was marked absent from ' ||
        coalesce(v_group_name, 'class') || ' on ' || coalesce(v_session_date::text, 'today') || '.',
      'sent',
      false
    );
  end loop;

  return NEW;
end;
$$;

revoke all on function app.notify_attendance_absent() from public;

drop trigger if exists trg_notify_attendance_absent on public.attendance_records;
create trigger trg_notify_attendance_absent
after insert on public.attendance_records
for each row execute function app.notify_attendance_absent();

-- Grant execute on new functions to service_role (follows pattern from migration 005)
grant execute on function app.notify_new_message() to service_role;
grant execute on function app.notify_announcement_published() to service_role;
grant execute on function app.notify_homework_published() to service_role;
grant execute on function app.notify_attendance_absent() to service_role;
