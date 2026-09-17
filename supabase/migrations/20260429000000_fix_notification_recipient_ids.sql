-- Fix: notification_queue.recipient_profile_id must reference profiles(id),
-- but the fanout triggers were passing parent_profiles.id / teacher_profiles.id
-- (domain profile IDs) instead of the parent_profiles.profile_id /
-- teacher_profiles.profile_id (auth user IDs).
--
-- Three triggers affected:
--   notify_announcement_published  — group audience branch
--   notify_homework_published       — both audience branches
--   notify_attendance_absent        — parent loop

-- ── notify_announcement_published ──────────────────────────────────────────
create or replace function app.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
begin
  if (TG_OP = 'INSERT' and not NEW.is_published) then return NEW; end if;
  if (TG_OP = 'UPDATE' and (OLD.is_published or not NEW.is_published)) then return NEW; end if;

  if NEW.audience = 'mosque' then
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
        NEW.mosque_id, v_recipient.profile_id, 'email',
        NEW.title, left(NEW.body, 200), 'sent', false, NEW.id
      );
    end loop;
  else
    -- Group announcement: notify parents (via profile_id) + teachers (via profile_id)
    for v_recipient in
      select distinct pp.profile_id
      from public.group_enrollments ge
      join public.parent_student_links psl
        on psl.student_profile_id = ge.student_profile_id
       and psl.mosque_id = NEW.mosque_id
      join public.parent_profiles pp on pp.id = psl.parent_profile_id
      where ge.group_id = NEW.group_id
        and ge.is_active = true
      union
      select tp.profile_id
      from public.teacher_group_links tgl
      join public.teacher_profiles tp on tp.id = tgl.teacher_profile_id
      where tgl.group_id = NEW.group_id
        and tgl.is_active = true
    loop
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body,
        status, is_read, source_announcement_id
      ) values (
        NEW.mosque_id, v_recipient.profile_id, 'email',
        NEW.title, left(NEW.body, 200), 'sent', false, NEW.id
      );
    end loop;
  end if;

  return NEW;
end;
$$;

-- ── notify_homework_published ───────────────────────────────────────────────
create or replace function app.notify_homework_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_name text;
  v_recipient  record;
begin
  if (TG_OP = 'INSERT' and not NEW.is_published) then return NEW; end if;
  if (TG_OP = 'UPDATE' and (OLD.is_published or not NEW.is_published)) then return NEW; end if;

  select name into v_group_name from public.groups where id = NEW.group_id;

  if NEW.audience = 'group' then
    for v_recipient in
      select distinct pp.profile_id
      from public.group_enrollments ge
      join public.parent_student_links psl
        on psl.student_profile_id = ge.student_profile_id
       and psl.mosque_id = NEW.mosque_id
      join public.parent_profiles pp on pp.id = psl.parent_profile_id
      where ge.group_id = NEW.group_id
        and ge.is_active = true
    loop
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body, status, is_read
      ) values (
        NEW.mosque_id, v_recipient.profile_id, 'email',
        'New homework: ' || NEW.title,
        'New homework has been assigned in ' || coalesce(v_group_name, 'your class')
          || ': ' || NEW.title
          || case when NEW.due_date is not null then ' (due ' || NEW.due_date::text || ')' else '' end,
        'sent', false
      );
    end loop;
  else
    for v_recipient in
      select distinct pp.profile_id
      from public.homework_targets ht
      join public.parent_student_links psl
        on psl.student_profile_id = ht.student_profile_id
       and psl.mosque_id = NEW.mosque_id
      join public.parent_profiles pp on pp.id = psl.parent_profile_id
      where ht.homework_id = NEW.id
    loop
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body, status, is_read
      ) values (
        NEW.mosque_id, v_recipient.profile_id, 'email',
        'New homework: ' || NEW.title,
        'New homework has been assigned in ' || coalesce(v_group_name, 'your class')
          || ': ' || NEW.title
          || case when NEW.due_date is not null then ' (due ' || NEW.due_date::text || ')' else '' end,
        'sent', false
      );
    end loop;
  end if;

  return NEW;
end;
$$;

-- ── notify_attendance_absent ────────────────────────────────────────────────
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
  if NEW.status <> 'absent' then return NEW; end if;

  select sp.full_name into v_student_name
  from public.student_profiles sp
  where sp.id = NEW.student_profile_id;

  select g.name, s.session_date
    into v_group_name, v_session_date
  from public.attendance_sessions s
  join public.groups g on g.id = s.group_id
  where s.id = NEW.session_id;

  for v_recipient in
    select pp.profile_id
    from public.parent_student_links psl
    join public.parent_profiles pp on pp.id = psl.parent_profile_id
    where psl.student_profile_id = NEW.student_profile_id
      and psl.mosque_id = NEW.mosque_id
  loop
    insert into public.notification_queue (
      mosque_id, recipient_profile_id, channel, subject, body, status, is_read
    ) values (
      NEW.mosque_id, v_recipient.profile_id, 'email',
      coalesce(v_student_name, 'Your child') || ' was absent',
      coalesce(v_student_name, 'Your child') || ' was marked absent from '
        || coalesce(v_group_name, 'class') || ' on '
        || coalesce(v_session_date::text, 'today') || '.',
      'sent', false
    );
  end loop;

  return NEW;
end;
$$;
