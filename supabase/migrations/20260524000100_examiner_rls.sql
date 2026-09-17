-- RLS for exam_requests and exam_sessions.
--
-- Visibility:
--   * Admins: full access within their mosque.
--   * Examiners: read/write exam_sessions; read pending exam_requests.
--   * Teachers: read exam_requests they created; insert new requests.

-- ---------------------------------------------------------------------------
-- Helper: returns the examiner teacher_profile_id for the current user
-- ---------------------------------------------------------------------------

create or replace function app.current_examiner_profile_id(target_mosque uuid)
returns uuid
language sql
stable
security definer
set search_path = public, app
as $$
  select tp.id
  from public.teacher_profiles tp
  join public.memberships m
    on m.user_id = tp.profile_id
    and m.mosque_id = tp.mosque_id
    and m.role = 'examiner'
    and m.is_active
  where tp.profile_id = auth.uid()
    and tp.mosque_id = target_mosque
    and tp.is_active
  limit 1;
$$;

revoke all on function app.current_examiner_profile_id(uuid) from public;
grant execute on function app.current_examiner_profile_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.exam_requests  enable row level security;
alter table public.exam_sessions   enable row level security;

-- ---------------------------------------------------------------------------
-- exam_requests
-- ---------------------------------------------------------------------------

create policy exam_requests_select
  on public.exam_requests for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or app.current_examiner_profile_id(mosque_id) is not null
    or requested_by in (select app.current_teacher_profile_ids(mosque_id))
  );

create policy exam_requests_insert
  on public.exam_requests for insert
  to authenticated
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or requested_by in (select app.current_teacher_profile_ids(mosque_id))
  );

create policy exam_requests_update
  on public.exam_requests for update
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or app.current_examiner_profile_id(mosque_id) is not null
  );

-- ---------------------------------------------------------------------------
-- exam_sessions
-- ---------------------------------------------------------------------------

create policy exam_sessions_select
  on public.exam_sessions for select
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or app.current_examiner_profile_id(mosque_id) is not null
    or examiner_profile_id in (select app.current_teacher_profile_ids(mosque_id))
  );

create policy exam_sessions_insert
  on public.exam_sessions for insert
  to authenticated
  with check (
    app.has_role(mosque_id, 'mosque_admin')
    or app.current_examiner_profile_id(mosque_id) is not null
  );

create policy exam_sessions_update
  on public.exam_sessions for update
  to authenticated
  using (
    app.has_role(mosque_id, 'mosque_admin')
    or app.is_platform_owner()
    or app.current_examiner_profile_id(mosque_id) is not null
  );
