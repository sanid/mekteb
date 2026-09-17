-- Fix: notify_new_message trigger referenced NEW.sender_profile_id, but the
-- messages table uses author_profile_id. Restate the function with the correct
-- column name.

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
grant execute on function app.notify_new_message() to service_role;
