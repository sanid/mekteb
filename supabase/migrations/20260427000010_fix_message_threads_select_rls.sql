-- Fix message_threads RLS: the insert policy uses .insert().select().single()
-- which applies the SELECT policy to the RETURNING clause. Since the caller
-- hasn't been added as a participant yet, the select policy blocks the read.
-- Fix: allow reading threads you created (covers the insert-returning case).

drop policy message_threads_select on public.message_threads;

create policy message_threads_select
  on public.message_threads for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.message_participants mp
      where mp.thread_id = id
        and mp.profile_id = auth.uid()
    )
  );
