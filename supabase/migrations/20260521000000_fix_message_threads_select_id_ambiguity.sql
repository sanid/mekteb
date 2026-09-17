-- Bug: message_threads_select RLS used unqualified `id` in the EXISTS subquery.
-- Postgres resolves the unqualified column to the INNER scope (mp.id) instead
-- of the outer message_threads.id, so the predicate became `mp.thread_id = mp.id`
-- which never matches. Result: non-creator participants could not see threads
-- they belonged to (only the thread creator saw it via the OR branch).
--
-- Fix: qualify the column as message_threads.id.

drop policy message_threads_select on public.message_threads;

create policy message_threads_select
  on public.message_threads for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.message_participants mp
      where mp.thread_id = message_threads.id
        and mp.profile_id = auth.uid()
    )
  );
