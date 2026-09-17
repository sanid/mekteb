-- Student QR self check-in plugin.
--
-- "QR-Selbstanmeldung" for attendance: a teacher opens check-in on a group's
-- lesson day, the group page shows a QR encoding a per-session token
-- (`/checkin/<token>`), and students scan it to mark themselves present
-- without the teacher walking around with the register. Mosques can switch
-- the whole feature on/off under Settings → Plugins.
--
-- Gating:
--   • `openCheckin` refuses to open a session when the plugin is off.
--   • The check-in panel on the teacher group page is hidden when off.
--   • `closeCheckin` stays available (a teacher must be able to clean up a
--     session opened earlier).
--   • The public `/checkin/<token>` page shows the "closed" state when the
--     mosque has the plugin off — a disabled feature must not silently
--     accept scans.

insert into public.plugin_registry (id, name, description, category, sort_order)
values (
  'student_checkin',
  'Student QR Check-In',
  'Let students mark themselves present by scanning a QR code shown on the group page when check-in is open.',
  'education',
  17
)
on conflict (id) do nothing;

-- Activate for mosques that already exist (fresh mosques get it via the
-- auto-activate trigger on mosque creation).
insert into public.mosque_plugins (mosque_id, plugin_id, is_active)
select m.id, 'student_checkin', true
from public.mosques m
on conflict (mosque_id, plugin_id) do nothing;
