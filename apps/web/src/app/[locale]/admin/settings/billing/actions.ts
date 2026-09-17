"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, PLAN_PRICES } from "@/lib/stripe";
import { actionError } from "@/lib/action-errors";

type Result = { error: string } | { ok: true };

export async function cancelSubscription(): Promise<Result> {
  const ctx = await requireAdmin();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("mosque_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return await actionError("no_active_subscription");
  }
  if (sub.status === "canceled") {
    return await actionError("subscription_already_canceled");
  }

  try {
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await admin.from("mosque_subscriptions")
      .update({
        cancel_at_period_end: true,
        cancels_at: updated.cancel_at
          ? new Date(updated.cancel_at * 1000).toISOString()
          : null,
        // Cancelling IS the downgrade path: when the period ends, the webhook
        // moves the mosque to the free starter plan.
        pending_plan_id: "starter",
      })
      .eq("mosque_id", ctx.mosqueId);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function reactivateSubscription(): Promise<Result> {
  const ctx = await requireAdmin();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("mosque_subscriptions")
    .select("stripe_subscription_id")
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return await actionError("no_subscription_found");
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await admin.from("mosque_subscriptions")
      .update({ cancel_at_period_end: false, cancels_at: null, pending_plan_id: null })
      .eq("mosque_id", ctx.mosqueId);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Switch the live Stripe subscription to another paid plan (upgrade or
 * downgrade — both change the price on the *same* subscription, so this also
 * fixes the old flow where clicking a paid plan opened checkout and created a
 * *second* subscription while the first kept billing).
 *
 * The free (starter) plan is not a price: it is a downgrade at the end of the
 * billing period, handled by `cancelSubscription` (which records
 * `pending_plan_id`).
 */
export async function switchPlan(planId: string): Promise<Result> {
  const ctx = await requireAdmin();
  const admin = createAdminClient();

  const [{ data: sub }, { data: plan }] = await Promise.all([
    admin
      .from("mosque_subscriptions")
      .select("stripe_subscription_id, plan_id, status")
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle(),
    admin.from("plans").select("id, price_monthly_eur").eq("id", planId).maybeSingle(),
  ]);

  if (!plan) return await actionError("plan_not_found");
  if (!sub?.stripe_subscription_id) return await actionError("no_active_subscription");
  if (sub.status === "canceled") return await actionError("subscription_already_canceled");
  if (plan.id === sub.plan_id) return await actionError("already_on_plan");

  if (plan.price_monthly_eur === 0) {
    return await cancelSubscription();
  }

  const priceId = PLAN_PRICES[plan.id];
  if (!priceId) return await actionError("plan_not_found");

  try {
    const existing = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = existing.items.data[0];
    if (!item) return { error: "The subscription has no billable item." };

    const updated = await stripe.subscriptions.update(existing.id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: "create_prorations",
      // Switching away cancels any pending cancellation (the period-end
      // downgrade to free) — a fresh switch overrides an old intent.
      cancel_at_period_end: false,
      metadata: { ...(existing.metadata ?? {}), plan_id: plan.id },
    });

    await admin.from("mosque_subscriptions")
      .update({
        plan_id: plan.id,
        cancel_at_period_end: updated.cancel_at_period_end,
        cancels_at: updated.cancel_at
          ? new Date(updated.cancel_at * 1000).toISOString()
          : null,
        pending_plan_id: null,
      })
      .eq("mosque_id", ctx.mosqueId);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
