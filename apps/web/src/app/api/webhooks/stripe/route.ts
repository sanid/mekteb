import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency guard: Stripe redelivers events (retries, dashboard resend).
  // If we already processed this id, ack without re-running the handlers.
  const { data: seen } = await admin
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (seen) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const mosqueId = session.metadata?.mosque_id;
      const planId   = session.metadata?.plan_id ?? "growth";
      if (!mosqueId) break;

      await admin.from("mosque_subscriptions").upsert(
        {
          mosque_id: mosqueId,
          plan_id: planId,
          status: "active",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          trial_ends_at: null,
        },
        { onConflict: "mosque_id" },
      );
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const status =
        sub.status === "active"   ? "active"   :
        sub.status === "trialing" ? "trialing" :
        sub.status === "past_due" ? "past_due" : "canceled";

      await admin.from("mosque_subscriptions")
        .update({
          status,
          stripe_subscription_id: sub.id,
          ...(sub.metadata?.plan_id ? { plan_id: sub.metadata.plan_id } : {}),
          cancel_at_period_end: sub.cancel_at_period_end,
          cancels_at: sub.cancel_at
            ? new Date(sub.cancel_at * 1000).toISOString()
            : null,
        })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      // Apply the pending downgrade now that the billing period has actually
      // ended (cancelSubscription recorded it), then clear it.
      const { data: current } = await admin
        .from("mosque_subscriptions")
        .select("pending_plan_id")
        .eq("stripe_customer_id", sub.customer as string)
        .maybeSingle();
      await admin.from("mosque_subscriptions")
        .update({
          status: "canceled",
          ...(current?.pending_plan_id ? { plan_id: current.pending_plan_id } : {}),
          pending_plan_id: null,
        })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await admin.from("mosque_subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_customer_id", invoice.customer as string);
      break;
    }
  }

  // Record only after the handlers ran: if processing failed above, a
  // redelivery will retry instead of being skipped as "seen".
  await admin.from("stripe_webhook_events").insert({ event_id: event.id });

  return NextResponse.json({ received: true });
}
