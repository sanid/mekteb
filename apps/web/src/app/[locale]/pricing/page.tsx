import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/routing";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { GithubIcon } from "@/components/icons";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export default async function PricingPage() {
  const t = await getTranslations("Pricing");

  // Beta: only the free plan can be signed up for. "Verein" is announced
  // without a price or a signup button.
  const plans = [
    {
      id: "starter",
      name: t("starterName"),
      description: t("starterDesc"),
      features: [t("starterF1"), t("starterF2"), t("starterF3")],
      available: true,
    },
    {
      id: "verein",
      name: t("vereinName"),
      description: t("vereinDesc"),
      features: [t("vereinF1"), t("vereinF2"), t("vereinF3")],
      available: false,
    },
  ];

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen">
        <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-muted max-w-xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          {/* Self-host note */}
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-3 rounded-xl border border-card-border bg-card/40 px-6 py-4 text-sm max-w-2xl mx-auto">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <GithubIcon className="h-4 w-4 shrink-0 text-muted" />
              <span className="font-semibold">{t("selfHostTitle")}</span>
              <span className="text-muted">{t("selfHostDesc")}</span>
            </div>
            <a
              href="https://github.com/sanid/mekteb"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
            >
              {t("selfHostCta")}
            </a>
          </div>

          <div className="mx-auto grid max-w-3xl grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-8",
                  plan.available ? "border-accent ring-1 ring-accent" : "border-card-border",
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold",
                      plan.available ? "bg-accent-subtle text-accent" : "hidden",
                    )}
                  >
                    {plan.available ? t("betaBadge") : null}
                  </span>
                </div>
                <div className="mt-2 h-10 text-4xl font-semibold">
                  {plan.available ? t("starterPrice") : null}
                </div>
                <p className="mt-3 text-sm text-muted">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.available ? "text-accent" : "text-muted")} />
                      <span className={plan.available ? undefined : "text-muted"}>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.available ? (
                  <Link href="/onboarding?plan=starter" className={cn(buttonVariants(), "mt-8 w-full")}>
                    {t("startFree")}
                  </Link>
                ) : (
                  <div className="mt-8 flex h-10 items-center justify-center rounded-lg border border-dashed border-card-border text-sm text-muted">
                    {t("vereinSoon")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-muted">{t("betaNote")}</p>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
