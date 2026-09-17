-- QR Self Sign-In plugin.
--
-- "QR-Selbstanmeldung": when a parent, teacher or student account is created,
-- the hand-over shows a QR code that encodes the login URL with the temporary
-- credentials pre-filled (`?email=&password=&open=1`); scanning it lands the
-- person on the login page ready to sign in, or in the mobile app if
-- installed. Mosques can now switch the whole feature on/off under
-- Settings → Plugins.
--
-- When the plugin is off, no QR codes are generated or shown anywhere (the
-- teacher group forms and the admin onboarding cards). QR codes that were
-- already shared keep working: the login page's `open=1` handling is not
-- gated, so a printed QR from before is never bricked — it just falls back
-- to the pre-filled web form if the feature was later disabled.

insert into public.plugin_registry (id, name, description, category, sort_order)
values (
  'qr_self_signup',
  'QR Self Sign-In',
  'Show a scan-to-login QR code with the pre-filled credentials whenever a parent, teacher or student account is created, plus the open-in-app step on the login page.',
  'integration',
  80
)
on conflict (id) do nothing;

-- Activate for mosques that already exist (fresh mosques get it via the
-- auto-activate trigger on mosque creation).
insert into public.mosque_plugins (mosque_id, plugin_id, is_active)
select m.id, 'qr_self_signup', true
from public.mosques m
on conflict (mosque_id, plugin_id) do nothing;
