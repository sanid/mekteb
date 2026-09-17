-- The service_role PostgreSQL user (used by createAdminClient / service-role
-- key) needs the same app-schema privileges as authenticated/anon so that
-- triggers like app.set_updated_at() can fire without "permission denied for
-- schema app".

grant usage on schema app to service_role;

grant execute on all functions in schema app to service_role;

alter default privileges in schema app
  grant execute on functions to service_role;
