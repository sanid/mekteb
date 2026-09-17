-- Notification preferences (open.md §4).
--
-- Per-user control over which events generate notifications. The model is
-- opt-out: an absent row means "enabled" (the historical behaviour), so this
-- migration changes nothing until a user actually turns something off.
--
-- Events covered are the four fanout trigger types. The GDPR-deletion notice
-- to mosque admins is deliberately NOT covered — it is a compliance message
-- and must never be switchable off.

-- ---------------------------------------------------------------------------
-- 1. Type + table
-- ---------------------------------------------------------------------------

do $$ begin
  create type app.notification_type as enum (
    'message', 'announcement', 'homework', 'attendance_absent'
  );
exception when duplicate_object then null; end $$;

create table public.notification_preferences (
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type app.notification_type not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (mosque_id, profile_id, type)
);

create trigger set_updated_at
before update on public.notification_preferences
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. RLS — a user may only see and change their own rows
-- ---------------------------------------------------------------------------

alter table public.notification_preferences enable row level security;

create policy "users manage own notification preferences"
on public.notification_preferences
for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Helper — absent row means enabled (opt-out model)
-- ---------------------------------------------------------------------------

create or replace function app.notification_enabled(
  p_mosque_id uuid,
  p_profile_id uuid,
  p_type app.notification_type
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select p.enabled
       from public.notification_preferences p
      where p.mosque_id = p_mosque_id
        and p.profile_id = p_profile_id
        and p.type = p_type),
    true
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Re-create the four fanout triggers with the preference guard.
--    Each is a copy of its latest definition plus a `continue` when the
--    recipient disabled that event type.
-- ---------------------------------------------------------------------------

-- ── message.new ────────────────────────────────────────────────────────────

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
    if not app.notification_enabled(v_mosque_id, v_participant.profile_id, 'message') then
      continue;
    end if;
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
      -- distinct: a user can hold several roles (teacher + examiner), each an
      -- active memberships row — without this they get one notification per
      -- role.
      select distinct m.user_id as profile_id
      from public.memberships m
      where m.mosque_id = NEW.mosque_id
        and m.is_active
        and m.user_id <> NEW.created_by
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
    if not app.notification_enabled(NEW.mosque_id, v_recipient.profile_id, 'attendance_absent') then
      continue;
    end if;
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

-- ---------------------------------------------------------------------------
-- 5. Grants (re-create keeps existing grants, but fresh DBs need them)
-- ---------------------------------------------------------------------------

grant execute on function app.notify_new_message() to service_role;
grant execute on function app.notify_announcement_published() to service_role;
grant execute on function app.notify_homework_published() to service_role;
grant execute on function app.notify_attendance_absent() to service_role;
grant execute on function app.notification_enabled(uuid, uuid, app.notification_type) to service_role, authenticated;
