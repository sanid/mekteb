-- GDPR purge for messaging: when a user is deleted we want to
--   1) drop every message they authored (so no one can read their words),
--   2) drop every notification triggered by those messages,
--   3) keep their seat in shared threads as an anonymous "deleted" marker
--      so the other party can still see their own messages in context.

-- (1) Allow message_participants to survive the profile-cascade as a tombstone
-- participant with profile_id = NULL.
alter table public.message_participants
  alter column profile_id drop not null;

alter table public.message_participants
  drop constraint message_participants_profile_id_fkey;

alter table public.message_participants
  add constraint message_participants_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete set null;

-- (2) Extended purge function. Runs as service_role before auth.deleteUser
-- so we can still pivot on the user's id while their messages are present.
create or replace function public.purge_user_pii(target_user_id uuid, target_email text)
returns void
language plpgsql
security definer
set search_path to 'public', 'app'
as $$
begin
  update public.login_audit
     set email = null
   where user_id = target_user_id
      or email = target_email;

  update public.audit_logs
     set metadata = metadata - 'email' - 'full_name' - 'display_name'
   where actor_user_id = target_user_id
      or (metadata ? 'email' and metadata->>'email' = target_email);

  update public.gdpr_requests
     set email = null,
         reason = null,
         metadata = '{}'::jsonb
   where email = target_email
      or user_id = target_user_id;

  -- Notifications triggered by the deleted user's messages (these were sent
  -- to OTHER users and could still carry the deleted user's name in the body).
  delete from public.notification_queue
   where source_message_id in (
     select id from public.messages where author_profile_id = target_user_id
   );

  -- The messages themselves. Surviving participants will only see their own
  -- side of the conversation after this.
  delete from public.messages
   where author_profile_id = target_user_id;
end;
$$;

revoke all on function public.purge_user_pii(uuid, text) from public, anon, authenticated;
grant execute on function public.purge_user_pii(uuid, text) to service_role;
