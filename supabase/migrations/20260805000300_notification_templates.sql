-- Stop writing notification text in English inside the database.
--
-- The fanout triggers compose finished sentences — "New homework: …",
-- "… was absent" — and store them. Every client then shows English no matter
-- which of the four locales the reader uses, and there is nothing the UI can
-- do about it, because by the time a row is read the words are already baked
-- in. The one German-speaking mosque this is built for sees English in its
-- notification inbox.
--
-- Rather than translate in the database (which would need the reader's locale
-- at write time, and each recipient may differ), the triggers now also record
-- *what happened* — a template key and its parameters — and the client renders
-- it in the reader's language.
--
-- `subject`/`body` keep being written exactly as before. They are the fallback
-- for rows created before this migration and for the email sender, which reads
-- them directly; nothing that exists today breaks.
--
-- Announcements are deliberately left alone: their subject and body are the
-- announcement itself, written by a human in the mosque's own language, and
-- translating them is not ours to do.

alter table public.notification_queue
  add column if not exists template_key text,
  add column if not exists template_params jsonb;

comment on column public.notification_queue.template_key is
  'What happened, e.g. message.new — the client renders it in the reader''s locale. Null on rows written before templates existed.';
comment on column public.notification_queue.template_params is
  'Values the template interpolates. Dates are ISO strings so the client can format them per locale.';

-- ── message.new ────────────────────────────────────────────────────────────
--
-- Each function below is its live definition with the two columns added and
-- nothing else touched — recipient selection, the audience branch in homework
-- and the due-date suffix are all unchanged.
--
-- They live in `app`, which is where the triggers bind them; a `public` copy
-- of the same name compiles happily and is never called.

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
  where id = NEW.author_profile_id;

  for v_participant in
    select mp.profile_id
    from public.message_participants mp
    where mp.thread_id = NEW.thread_id
      and mp.profile_id <> NEW.author_profile_id
  loop
    insert into public.notification_queue (
      mosque_id,
      recipient_profile_id,
      channel,
      subject,
      body,
      status,
      is_read,
      source_message_id,
      template_key,
      template_params
    ) values (
      v_mosque_id,
      v_participant.profile_id,
      'email',
      coalesce(v_subject, 'New message'),
      coalesce(v_sender_name, 'Someone') || ' sent you a new message.',
      'sent',
      false,
      NEW.id,
      'message.new',
      jsonb_build_object('sender', v_sender_name, 'threadSubject', v_subject)
    );
  end loop;

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
    loop
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
    loop
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

-- ── attendance.absent ──────────────────────────────────────────────────────

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
      mosque_id, recipient_profile_id, channel, subject, body, status, is_read,
      template_key, template_params
    ) values (
      NEW.mosque_id, v_recipient.profile_id, 'email',
      coalesce(v_student_name, 'Your child') || ' was absent',
      coalesce(v_student_name, 'Your child') || ' was marked absent from '
        || coalesce(v_group_name, 'class') || ' on '
        || coalesce(v_session_date::text, 'today') || '.',
      'sent', false,
      'attendance.absent',
      jsonb_build_object('student', v_student_name, 'group', v_group_name,
                         'date', v_session_date)
    );
  end loop;

  return NEW;
end;
$$;
