import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// Keep a named export for backwards compat — but access is lazy via the getter.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const PLAN_PRICES: Record<string, string | undefined> = {
  growth:    process.env.STRIPE_PRICE_GROWTH,
  community: process.env.STRIPE_PRICE_COMMUNITY,
};
