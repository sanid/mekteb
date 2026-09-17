-- Give a chat its participants' names without opening up `profiles`.
--
-- Today the messaging routes read `message_participants(profiles(...))`, which
-- runs under the caller's RLS, and `profiles` is only selectable by the owner,
-- a platform owner, or a mosque admin. So an ordinary member sees `null` for
-- the person they are talking to: the web thread list falls back to "User" and
-- the app shows a neutral placeholder. Every 1:1 chat with an admin is
-- effectively anonymous.
--
-- The obvious fix — a `profiles` SELECT policy for people you share a thread
-- with — would also hand over `phone` and `avatar_url`, because RLS grants
-- rows, not columns. This function returns **names only**, for **threads the
-- caller is in**, and nothing else.
--
-- Being security definer, it bypasses RLS on `message_participants`; the
-- `exists` clause is therefore load-bearing, not decoration. Without it, any
-- authenticated user could name the participants of any thread.

create or replace function app.thread_participant_names(p_thread_ids uuid[])
returns table (thread_id uuid, profile_id uuid, name text)
language sql
stable
security definer
set search_path = public, app
as $$
  select
    mp.thread_id,
    mp.profile_id,
    nullif(coalesce(p.display_name, p.full_name, ''), '') as name
  from public.message_participants mp
  left join public.profiles p on p.id = mp.profile_id
  where mp.thread_id = any(p_thread_ids)
    and exists (
      select 1
      from public.message_participants me
      where me.thread_id = mp.thread_id
        and me.profile_id = auth.uid()
    );
$$;

revoke all on function app.thread_participant_names(uuid[]) from public;
grant execute on function app.thread_participant_names(uuid[]) to authenticated;

-- PostgREST only exposes `public`; an `app`-schema function is unreachable
-- from any client (this is the same trap that left `respond_to_exam_schedule`
-- dead for a year).
create or replace function public.thread_participant_names(p_thread_ids uuid[])
returns table (thread_id uuid, profile_id uuid, name text)
language sql
stable
security invoker
set search_path = public, app
as $$
  select * from app.thread_participant_names(p_thread_ids);
$$;

revoke all on function public.thread_participant_names(uuid[]) from public;
grant execute on function public.thread_participant_names(uuid[]) to authenticated;

comment on function public.thread_participant_names(uuid[]) is
  'Names of the participants of threads the caller belongs to. Names only — profiles stays closed.';
