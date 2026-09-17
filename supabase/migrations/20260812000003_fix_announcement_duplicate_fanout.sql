-- Fix duplicate mosque-audience announcement notifications.
--
-- app.notify_announcement_published() fanned out the mosque branch over
-- public.memberships without DISTINCT on user_id. Users can hold several
-- roles (the seed gives teacher+examiner to some), and each role is its own
-- active memberships row — so those users received one notification per role.
-- The inbox had quietly tolerated it; instant push made it visible as a phone
-- getting the same announcement twice.
--
-- Recreates the function with the distinct loop. 20260808000200 (the original
-- definition) is fixed too, so a fresh db reset does not reintroduce it.

create or replace function app.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
begin
  if (TG_OP = 'INSERT' and not NEW.is_published) then return NEW; end if;
  if (TG_OP = 'UPDATE' and (OLD.is_published or not NEW.is_published)) then return NEW; end if;

  if NEW.audience = 'mosque' then
    for v_recipient in
      -- distinct: a user can hold several roles (teacher + examiner), each an
      -- active memberships row — without this they get one notification per
      -- role.
      select distinct m.user_id as profile_id
      from public.memberships m
      where m.mosque_id = NEW.mosque_id
        and m.is_active
        and m.user_id <> NEW.created_by
    loop
      if not app.notification_enabled(NEW.mosque_id, v_recipient.profile_id, 'announcement') then
        continue;
      end if;
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body,
        status, is_read, source_announcement_id
      ) values (
        NEW.mosque_id, v_recipient.profile_id, 'email',
        NEW.title, left(NEW.body, 200), 'sent', false, NEW.id
      );
    end loop;
  else
    -- Group announcement: notify parents (via profile_id) + teachers (via profile_id)
    for v_recipient in
      select distinct pp.profile_id
      from public.group_enrollments ge
      join public.parent_student_links psl
        on psl.student_profile_id = ge.student_profile_id
       and psl.mosque_id = NEW.mosque_id
      join public.parent_profiles pp on pp.id = psl.parent_profile_id
      where ge.group_id = NEW.group_id
        and ge.is_active = true
      union
      select tp.profile_id
      from public.teacher_group_links tgl
      join public.teacher_profiles tp on tp.id = tgl.teacher_profile_id
      where tgl.group_id = NEW.group_id
        and tgl.is_active = true
    loop
      if not app.notification_enabled(NEW.mosque_id, v_recipient.profile_id, 'announcement') then
        continue;
      end if;
      insert into public.notification_queue (
        mosque_id, recipient_profile_id, channel, subject, body,
        status, is_read, source_announcement_id
      ) values (
        NEW.mosque_id, v_recipient.profile_id, 'email',
        NEW.title, left(NEW.body, 200), 'sent', false, NEW.id
      );
    end loop;
  end if;

  return NEW;
end;
$$;

revoke all on function app.notify_announcement_published() from public;
grant execute on function app.notify_announcement_published() to service_role;
