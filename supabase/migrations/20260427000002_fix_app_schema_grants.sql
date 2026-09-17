-- Grant the authenticated and anon roles access to the app schema so that
-- RLS policies can call app.* helper functions (app.is_admin, app.is_teacher,
-- app.current_mosque_id, etc.).  Without this, every DML that hits a policy
-- using these helpers fails with "permission denied for schema app".

grant usage on schema app to authenticated, anon;

grant execute on all functions in schema app to authenticated, anon;

-- Ensure future functions added to the schema are also accessible.
alter default privileges in schema app
  grant execute on functions to authenticated, anon;
