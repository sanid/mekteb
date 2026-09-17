-- Fix infinite recursion in message_participants RLS.
-- The select policy referenced message_participants from within itself.
-- Solution: SECURITY DEFINER helper that bypasses RLS on the self-query.

create or replace function app.is_thread_participant(check_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_participants mp
    where mp.thread_id = check_thread_id
      and mp.profile_id = auth.uid()
  );
$$;

revoke all on function app.is_thread_participant(uuid) from public;
grant execute on function app.is_thread_participant(uuid) to authenticated;

-- Replace the recursive policy.
drop policy message_participants_select on public.message_participants;

create policy message_participants_select
  on public.message_participants for select
  to authenticated
  using (
    profile_id = auth.uid()
    or app.is_thread_participant(thread_id)
  );
