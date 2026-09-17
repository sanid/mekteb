-- Phase 4: communication.
-- announcements: mosque-wide or group-targeted broadcasts from admins/teachers.
-- message_threads: bi-directional threaded messaging (admin↔teacher, admin↔parent,
--   teacher↔parent — not yet student-facing).
-- message_participants: who is in each thread (many-to-many).
-- messages: individual messages within a thread.
-- notification_queue: outbound notifications (email, push) to be fanned out by
--   an Edge Function. Row is inserted on each event; the function marks it
--   sent/failed.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'announcement_audience') then
    create type app.announcement_audience as enum ('mosque', 'group');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type app.notification_channel as enum ('email', 'push', 'sms');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_status') then
    create type app.notification_status as enum ('pending', 'sent', 'failed');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  audience app.announcement_audience not null default 'mosque',
  title text not null,
  body text not null,
  is_published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index announcements_mosque_id_idx
  on public.announcements (mosque_id, created_at desc);
create index announcements_group_id_idx
  on public.announcements (group_id, created_at desc);

create trigger set_updated_at
before update on public.announcements
for each row execute function app.set_updated_at();

-- audience=group requires a group_id pointing to the same mosque.
create or replace function app.check_announcement_mosque()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  group_mosque uuid;
begin
  if new.audience = 'group' then
    if new.group_id is null then
      raise exception 'announcements: group_id required for group audience';
    end if;
    select mosque_id into group_mosque from public.groups where id = new.group_id;
    if group_mosque is distinct from new.mosque_id then
      raise exception 'announcements: group must belong to same mosque';
    end if;
  end if;
  return new;
end;
$$;

create trigger announcements_mosque_check
before insert or update on public.announcements
for each row execute function app.check_announcement_mosque();

-- ---------------------------------------------------------------------------
-- message_threads
-- ---------------------------------------------------------------------------

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index message_threads_mosque_id_idx
  on public.message_threads (mosque_id, updated_at desc);

create trigger set_updated_at
before update on public.message_threads
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- message_participants
-- ---------------------------------------------------------------------------

create table public.message_participants (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (thread_id, profile_id)
);

create index message_participants_thread_idx
  on public.message_participants (thread_id);
create index message_participants_profile_idx
  on public.message_participants (profile_id, mosque_id);

create trigger set_updated_at
before update on public.message_participants
for each row execute function app.set_updated_at();

-- mosque invariant: thread and participant must share the same mosque.
create or replace function app.check_participant_mosque()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  thread_mosque uuid;
begin
  select mosque_id into thread_mosque
    from public.message_threads where id = new.thread_id;
  if thread_mosque is distinct from new.mosque_id then
    raise exception 'message_participants: thread must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger message_participants_mosque_check
before insert or update on public.message_participants
for each row execute function app.check_participant_mosque();

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index messages_thread_id_idx
  on public.messages (thread_id, created_at);
create index messages_mosque_id_idx
  on public.messages (mosque_id);

create trigger set_updated_at
before update on public.messages
for each row execute function app.set_updated_at();

create or replace function app.check_message_mosque()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  thread_mosque uuid;
begin
  select mosque_id into thread_mosque
    from public.message_threads where id = new.thread_id;
  if thread_mosque is distinct from new.mosque_id then
    raise exception 'messages: thread must belong to same mosque';
  end if;
  return new;
end;
$$;

create trigger messages_mosque_check
before insert or update on public.messages
for each row execute function app.check_message_mosque();

-- Bump thread updated_at whenever a new message is posted so inbox lists
-- can sort by most recent activity.
create or replace function app.bump_thread_on_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.message_threads
    set updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$;

create trigger messages_bump_thread
after insert on public.messages
for each row execute function app.bump_thread_on_message();

-- ---------------------------------------------------------------------------
-- notification_queue
-- ---------------------------------------------------------------------------

create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  channel app.notification_channel not null default 'email',
  subject text,
  body text not null,
  status app.notification_status not null default 'pending',
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  -- optional source references for deduplication / tracing
  source_announcement_id uuid references public.announcements(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_queue_pending_idx
  on public.notification_queue (status, scheduled_for)
  where status = 'pending';
create index notification_queue_recipient_idx
  on public.notification_queue (recipient_profile_id, created_at desc);

create trigger set_updated_at
before update on public.notification_queue
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.announcements         enable row level security;
alter table public.message_threads       enable row level security;
alter table public.message_participants  enable row level security;
alter table public.messages              enable row level security;
alter table public.notification_queue    enable row level security;

-- announcements: members of the mosque can read published ones;
--   admins/teachers can create/update/delete.
create policy announcements_select
  on public.announcements for select
  to authenticated
  using (
    is_published = true
    and app.is_member(mosque_id)
  );

create policy announcements_insert
  on public.announcements for insert
  to authenticated
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.has_role(mosque_id, 'teacher')
  );

create policy announcements_update
  on public.announcements for update
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or (
      app.has_role(mosque_id, 'teacher')
      and author_profile_id = auth.uid()
    )
  );

create policy announcements_delete
  on public.announcements for delete
  to authenticated
  using (app.has_role(mosque_id, 'mosque_admin'));

-- message_threads: visible only to participants.
-- NOTE: the correlation must be qualified as `message_threads.id`. An
-- unqualified `id` resolves to the inner alias `mp.id`, making the predicate
-- `mp.thread_id = mp.id` — never true for non-creators (see
-- 20260521000000 for the post-hoc fix; this is the qualified form so the
-- source of truth matches the live policy).
create policy message_threads_select
  on public.message_threads for select
  to authenticated
  using (
    exists (
      select 1 from public.message_participants mp
      where mp.thread_id = message_threads.id
        and mp.profile_id = auth.uid()
    )
  );

create policy message_threads_insert
  on public.message_threads for insert
  to authenticated
  with check (app.is_member(mosque_id));

-- message_participants: see rows for threads you participate in.
create policy message_participants_select
  on public.message_participants for select
  to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.message_participants mp2
      where mp2.thread_id = thread_id
        and mp2.profile_id = auth.uid()
    )
  );

create policy message_participants_insert
  on public.message_participants for insert
  to authenticated
  with check (app.is_member(mosque_id));

create policy message_participants_update
  on public.message_participants for update
  to authenticated
  using (profile_id = auth.uid());

-- messages: read if you're a participant; write if you're a participant.
-- NOTE: the correlation must be qualified as `messages.thread_id`. An
-- unqualified `thread_id` resolves to the inner alias `mp.thread_id`, making
-- the predicate always true (see 20260809000400 for the post-hoc fix).
create policy messages_select
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.message_participants mp
      where mp.thread_id = messages.thread_id
        and mp.profile_id = auth.uid()
    )
  );

create policy messages_insert
  on public.messages for insert
  to authenticated
  with check (
    author_profile_id = auth.uid()
    and exists (
      select 1 from public.message_participants mp
      where mp.thread_id = messages.thread_id
        and mp.profile_id = auth.uid()
    )
  );

-- notification_queue: users see only their own notifications.
create policy notification_queue_select
  on public.notification_queue for select
  to authenticated
  using (recipient_profile_id = auth.uid());

-- Writes to notification_queue go through service-role (Edge Functions).
