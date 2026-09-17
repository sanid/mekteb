-- GDPR/DSGVO: a deletion request, once executed, must leave no PII behind.
-- The tombstone row (status='completed') is kept for accountability, but it
-- no longer stores the deleted user's email.
alter table public.gdpr_requests
  alter column email drop not null;

-- Helper that anonymises every row referencing a deleted user before the
-- cascade strips their auth row. Removes email from login_audit and scrubs
-- any email/full_name we ever wrote into audit_logs.metadata.
-- Lives in `public` so the service-role JS client can call it via .rpc().
create or replace function public.purge_user_pii(target_user_id uuid, target_email text)
returns void
language plpgsql
security definer
set search_path to 'public', 'app'
as $$
begin
  -- login_audit.email is free-form text; user_id cascades to NULL but the
  -- email column survives. Wipe it for this user explicitly.
  update public.login_audit
     set email = null
   where user_id = target_user_id
      or email = target_email;

  -- Strip personal fields from audit metadata wherever we wrote one
  -- (gdpr.deletion_requested, gdpr.user_deleted, onboarding rows etc.).
  update public.audit_logs
     set metadata = metadata - 'email' - 'full_name' - 'display_name'
   where actor_user_id = target_user_id
      or (metadata ? 'email' and metadata->>'email' = target_email);

  -- Wipe any stale gdpr_requests rows that still carry this user's email
  -- or user_id (defensive — cascade should already have removed them).
  update public.gdpr_requests
     set email = null,
         reason = null,
         metadata = '{}'::jsonb
   where email = target_email
      or user_id = target_user_id;
end;
$$;

revoke all on function public.purge_user_pii(uuid, text) from public, anon, authenticated;
grant execute on function public.purge_user_pii(uuid, text) to service_role;
