-- Mosque admins can delete device tokens of their members.
--
-- The admin list UI exists (`/admin/device-tokens`); without a delete policy
-- it would be read-only, and stale tokens (uninstalled apps, users who left)
-- would accumulate forever. The server-side push job already removes tokens
-- that APNs/FCM report as unregistered; this lets an admin clean up the rest
-- by hand.

create policy device_tokens_delete_admin on public.device_tokens
  for delete to authenticated
  using (app.has_role(mosque_id, 'mosque_admin'));
