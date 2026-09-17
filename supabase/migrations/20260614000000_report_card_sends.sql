-- Tracks report-card emails so the scheduled job (and manual sends) never
-- email the same student's parents twice for the same reporting period.

create table public.report_card_sends (
  id                 uuid        primary key default gen_random_uuid(),
  mosque_id          uuid        not null references public.mosques(id) on delete cascade,
  student_profile_id uuid        not null references public.student_profiles(id) on delete cascade,
  period_start       date        not null,
  recipients         integer     not null default 0,
  sent_at            timestamptz not null default now(),
  unique (student_profile_id, period_start)
);

create index report_card_sends_mosque_id_idx
  on public.report_card_sends (mosque_id, period_start);

alter table public.report_card_sends enable row level security;

-- Read-only visibility for admins; all writes happen through the service role
-- in the cron / admin action.
create policy "admin read report_card_sends"
  on public.report_card_sends
  for select
  using (app.has_role(mosque_id, 'mosque_admin') or app.is_platform_owner());
