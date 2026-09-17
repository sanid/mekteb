-- A downgrade target that takes effect when the Stripe subscription ends.
--
-- `mosque_subscriptions.plan_id` is what the UI shows as the current plan, and
-- it has to keep reflecting what is actually billed until the billing period
-- ends. So a paid → free (starter) downgrade is two steps: `cancelSubscription`
-- sets `cancel_at_period_end` AND records `pending_plan_id = 'starter'`; when
-- Stripe actually deletes the subscription, the webhook applies the pending
-- plan and clears the column. Reactivation clears it too.
--
-- Paid → paid switches (community ↔ growth) do not need this: they change the
-- price on the *same* Stripe subscription, so `plan_id` flips immediately.

alter table public.mosque_subscriptions
  add column if not exists pending_plan_id text;

comment on column public.mosque_subscriptions.pending_plan_id is
  'Plan the mosque moves to when the current Stripe subscription ends. Set by cancelSubscription (downgrade to free), applied by the stripe webhook on customer.subscription.deleted, cleared on reactivation.';
