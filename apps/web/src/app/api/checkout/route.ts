import { NextRequest, NextResponse } from "next/server";
import { stripe, PLAN_PRICES } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("mosque_id")
    .eq("user_id", user.id)
    .eq("role", "mosque_admin")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "No mosque admin membership" }, { status: 403 });

  const { planId } = await req.json() as { planId: string };
  const priceId = PLAN_PRICES[planId];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("mosque_subscriptions")
    .select("stripe_customer_id")
    .eq("mosque_id", membership.mosque_id)
    .maybeSingle();

  try {
    // Get or create Stripe customer
    let customerId = sub?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { mosque_id: membership.mosque_id },
      });
      customerId = customer.id;
      await admin.from("mosque_subscriptions").upsert(
        { mosque_id: membership.mosque_id, plan_id: planId, stripe_customer_id: customerId },
        { onConflict: "mosque_id" },
      );
    }

    // Create a SetupIntent to collect the card upfront.
    // After the card is saved we create the subscription server-side via /api/checkout/activate.
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { mosque_id: membership.mosque_id, plan_id: planId, price_id: priceId },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (err) {
    log.error("[checkout]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
