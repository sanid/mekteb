import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

// Called after stripe.confirmSetup() succeeds on the client.
// Retrieves the SetupIntent to get the saved payment method, then creates the subscription.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { setupIntentId } = await req.json() as { setupIntentId: string };
  if (!setupIntentId) return NextResponse.json({ error: "Missing setupIntentId" }, { status: 400 });

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  if (setupIntent.status !== "succeeded") {
    return NextResponse.json({ error: `Setup not complete (${setupIntent.status})` }, { status: 400 });
  }

  const paymentMethodId = typeof setupIntent.payment_method === "string"
    ? setupIntent.payment_method
    : setupIntent.payment_method?.id;
  const planId   = setupIntent.metadata?.plan_id;
  const priceId  = setupIntent.metadata?.price_id;
  const mosqueId = setupIntent.metadata?.mosque_id;
  const customerId = typeof setupIntent.customer === "string"
    ? setupIntent.customer
    : setupIntent.customer?.id;

  if (!paymentMethodId || !priceId || !planId || !mosqueId || !customerId) {
    return NextResponse.json({ error: "Incomplete setup intent metadata" }, { status: 400 });
  }

  // Verify the authenticated user is actually an admin of the mosque in the SetupIntent.
  // Without this check an attacker could reuse a SetupIntent to activate billing for any mosque.
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("mosque_id", mosqueId)
    .eq("role", "mosque_admin")
    .eq("is_active", true)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Set as default payment method on the customer
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const admin = createAdminClient();

    // If this mosque already has a live subscription, change the price on it
    // instead of creating a second one (the old flow stacked subscriptions
    // when someone switched plans through checkout).
    const { data: existingSub } = await admin
      .from("mosque_subscriptions")
      .select("stripe_subscription_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    let subscription: Stripe.Subscription;
    if (existingSub?.stripe_subscription_id) {
      const existing = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);
      const item = existing.items.data[0];
      if (!item) {
        return NextResponse.json({ error: "The subscription has no billable item." }, { status: 400 });
      }
      subscription = await stripe.subscriptions.update(existing.id, {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: "create_prorations",
        default_payment_method: paymentMethodId,
        cancel_at_period_end: false,
        metadata: { mosque_id: mosqueId, plan_id: planId },
      });
    } else {
      // Create the subscription — payment will be charged immediately using the saved card
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        metadata: { mosque_id: mosqueId, plan_id: planId },
      });
    }

    const status =
      subscription.status === "active"   ? "active"   :
      subscription.status === "trialing" ? "trialing" :
      subscription.status === "past_due" ? "past_due" : subscription.status;

    await admin.from("mosque_subscriptions")
      .update({
        stripe_subscription_id: subscription.id,
        plan_id: planId,
        status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancels_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
      })
      .eq("stripe_customer_id", customerId);

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    log.error("[checkout/activate]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
