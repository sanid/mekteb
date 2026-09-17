-- Students finally get an inbox (deep-review follow-up, 2026-08-17).
--
-- The fanout triggers never enqueued notifications for students: mosque
-- announcements resolve recipients through `memberships` (students hold no
-- membership row by design), group announcements and homework through
-- `parent_student_links`, and absence through parents. `lesson.cancelled`
-- already included students; announcements and homework did not — so a
-- student's notification_queue stayed empty even though RLS allows them to
-- read their own rows.
--
-- Each trigger below is the current definition from
-- 20260808000200_notification_preferences.sql plus a student-recipient
-- branch, still gated by app.notification_enabled.

-- ── announcement.published ─────────────────────────────────────────────────

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
      -- Staff and parents hold memberships rows; students are users too and
      -- must hear about mosque-wide news — their access comes from
      -- student_profiles, exactly like the RLS.
      select distinct m.user_id as profile_id
      from public.memberships m
      where m.mosque_id = NEW.mosque_id
        and m.is_active
        and m.user_id <> NEW.created_by
      union
      select distinct sp.profile_id
      from public.student_profiles sp
      where sp.mosque_id = NEW.mosque_id
        and sp.is_active
        and sp.profile_id is not null
    loop
      if not app.notification_enabled(NEW.mosque_id, v_recipient.profile_id, 'announcement') then
        continue;
      end if;
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body,
        status, is_read, source_announcement_id
      ) values (
        NEW.mosque_id, v_recipient.profile_id, 'email',
        NEW.title, left(NEW.body, 200), 'sent', false, NEW.id
      );
    end loop;
  else
    -- Group announcement: parents + teachers + the enrolled students.
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
      union
      select distinct sp.profile_id
      from public.group_enrollments ge
      join public.student_profiles sp on sp.id = ge.student_profile_id
      where ge.group_id = NEW.group_id
        and ge.is_active = true
        and sp.profile_id is not null
    loop
      if not app.notification_enabled(NEW.mosque_id, v_recipient.profile_id, 'announcement') then
        continue;
      end if;
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

-- ── homework.new ───────────────────────────────────────────────────────────

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
      union
      -- The students themselves: it is their homework.
      select distinct sp.profile_id
      from public.group_enrollments ge
      join public.student_profiles sp on sp.id = ge.student_profile_id
      where ge.group_id = NEW.group_id
        and ge.is_active = true
        and sp.profile_id is not null
    loop
      if not app.notification_enabled(NEW.mosque_id, v_recipient.profile_id, 'homework') then
        continue;
      end if;
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body, status, is_read,
        template_key, template_params
      ) values (
        NEW.mosque_id, v_recipient.profile_id, 'email',
        'New homework: ' || NEW.title,
        'New homework has been assigned in ' || coalesce(v_group_name, 'your class')
          || ': ' || NEW.title
          || case when NEW.due_date is not null then ' (due ' || NEW.due_date::text || ')' else '' end,
        'sent', false,
        'homework.new',
        jsonb_build_object('title', NEW.title, 'group', v_group_name,
                           'dueDate', NEW.due_date)
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
      union
      -- The targeted students themselves.
      select distinct sp.profile_id
      from public.homework_targets ht
      join public.student_profiles sp on sp.id = ht.student_profile_id
      where ht.homework_id = NEW.id
        and sp.profile_id is not null
    loop
      if not app.notification_enabled(NEW.mosque_id, v_recipient.profile_id, 'homework') then
        continue;
      end if;
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body, status, is_read,
        template_key, template_params
      ) values (
        NEW.mosque_id, v_recipient.profile_id, 'email',
        'New homework: ' || NEW.title,
        'New homework has been assigned in ' || coalesce(v_group_name, 'your class')
          || ': ' || NEW.title
          || case when NEW.due_date is not null then ' (due ' || NEW.due_date::text || ')' else '' end,
        'sent', false,
        'homework.new',
        jsonb_build_object('title', NEW.title, 'group', v_group_name,
                           'dueDate', NEW.due_date)
      );
    end loop;
  end if;

  return NEW;
end;
$$;

-- Grants (re-create keeps existing grants; fresh DBs need them).
grant execute on function app.notify_announcement_published() to service_role;
grant execute on function app.notify_homework_published() to service_role;
