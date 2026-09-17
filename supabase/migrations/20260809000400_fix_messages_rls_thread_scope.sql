-- Fix messages RLS: thread-scoped participant correlation was always true.
--
-- `messages_select` and `messages_insert` correlated the participant subquery
-- on an unqualified `thread_id`:
--
--     where mp.thread_id = thread_id
--
-- Postgres resolves the unqualified name to the *innermost* scope that has
-- such a column — here `mp.thread_id` (message_participants) — so the
-- predicate compiled to `mp.thread_id = mp.thread_id`, i.e. always true.
-- This is the same resolution trap documented in
-- `20260521000000_fix_message_threads_select_id_ambiguity.sql` (fixed there
-- for message_threads); the two `messages` policies were never fixed.
--
-- Practical impact: any authenticated user with a single participant row in
-- ANY thread could
--   • read every message in every mosque (messages_select), and
--   • post into any thread, triggering the fanout notification to all of its
--     participants (messages_insert).
-- In a database with no message data the leak is invisible — no participant
-- rows means the EXISTS is false for everyone — which is why it shipped and
-- survived until a dev database accumulated real threads.
--
-- Fix: qualify the correlation with the outer table (`messages.thread_id`),
-- exactly as the message_threads fix does. The original migration
-- (20260424000000_communication.sql) now contains the same qualified form for
-- fresh installs; this migration repairs databases created before it.

drop policy messages_select on public.messages;
drop policy messages_insert on public.messages;

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
