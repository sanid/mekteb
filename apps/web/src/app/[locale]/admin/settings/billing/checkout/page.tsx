"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ setupIntentId, planId }: { setupIntentId: string; planId: string }) {
  const t = useTranslations("Billing");
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    // Confirm the card setup (saves the card without charging)
    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? t("checkoutError"));
      setProcessing(false);
      return;
    }

    // Card saved — now create the subscription server-side
    const res = await fetch("/api/checkout/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupIntentId, planId }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };

    if (!res.ok || data.error) {
      setError(data.error ?? t("checkoutError"));
      setProcessing(false);
      return;
    }

    router.push(`/${locale}/admin/settings?tab=billing&success=1`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <p className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger-fg">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className={cn(buttonVariants({ size: "xl" }), "w-full")}
      >
        {processing ? t("processing") : t("subscribe")}
      </button>
    </form>
  );
}

export default function BillingCheckoutPage() {
  const t = useTranslations("Billing");
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan") ?? "";

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!planId || fetched.current) return;
    fetched.current = true;
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    })
      .then((r) => r.json())
      .then((data: { clientSecret?: string; setupIntentId?: string; error?: string }) => {
        if (data.error) { setError(data.error); return; }
        if (!data.clientSecret) { setError("Could not initialise payment. Please try again."); return; }
        setClientSecret(data.clientSecret);
        setSetupIntentId(data.setupIntentId ?? "");
      })
      .catch(() => setError("Could not initialise payment. Please try again."));
  }, [planId]);

  const appearance = {
    theme: "stripe" as const,
    variables: { colorPrimary: "#16a34a" },
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        <Link
          href="/admin/settings?tab=billing"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToBilling")}
        </Link>

        <div className="rounded-xl border border-card-border bg-card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <CreditCard className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">{t("upgradeTo", { plan: planId })}</h1>
            </div>
          </div>

          {!clientSecret && !error && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger-fg">
              {error}
            </p>
          )}

          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
              <CheckoutForm setupIntentId={setupIntentId} planId={planId} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
