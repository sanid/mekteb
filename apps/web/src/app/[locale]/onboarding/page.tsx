"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { createMosqueAndAdmin } from "./actions";
import PublicHeader from "@/components/PublicHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlanId = "starter" | "growth" | "community";
type Step = "plan" | "mosque" | "admin";

const inputClass = "mt-1 block w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20";

const STEP_ORDER: Step[] = ["plan", "mosque", "admin"];
// Beta: only the free plan can be chosen. Paid plans come back after the beta.
const PLAN_IDS: PlanId[] = ["starter"];

/**
 * Subdomain rules the server enforces (`/^[a-z0-9-]+$/`), tightened so the
 * generated URL also looks like one: no leading/trailing or doubled dashes.
 * German umlauts are transliterated rather than dropped, so "Grüne Moschee"
 * becomes `gruene-moschee` and not `grne-moschee`.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const isValidSlug = (slug: string) => slug.length >= 3 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug);

export default function OnboardingPage() {
  const t  = useTranslations("Onboarding");
  const tp = useTranslations("Pricing");
  const searchParams = useSearchParams();

  const planParam = searchParams.get("plan");
  const initialPlan: PlanId = PLAN_IDS.includes(planParam as PlanId) ? (planParam as PlanId) : "starter";

  const [step, setStep]             = useState<Step>("plan");
  const [plan, setPlan]             = useState<PlanId>(initialPlan);
  const [mosqueName, setMosqueName] = useState("");
  const [slug, setSlug]             = useState("");
  // Once the URL has been typed by hand it stops tracking the mosque name —
  // otherwise the next keystroke in the name field silently overwrites it.
  const [slugEdited, setSlugEdited] = useState(false);

  const [result, formAction, pending] = useActionState(
    (_prev: unknown, formData: FormData) => createMosqueAndAdmin(_prev, formData),
    null,
  );

  // If the action fails (returns error), the redirect didn't happen — stay on
  // the admin step. Adjusted during render so the wizard never flashes the
  // next step before falling back.
  const [handledResult, setHandledResult] = useState(result);
  if (handledResult !== result) {
    setHandledResult(result);
    if (result && "error" in result) setStep("admin");
  }

  const stepIndex  = STEP_ORDER.indexOf(step);
  const totalSteps = STEP_ORDER.length;
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const stepLabel = { plan: t("stepPlan"), mosque: t("stepMosque"), admin: t("stepAdmin") }[step];

  const mosqueStepValid = mosqueName.trim().length > 0 && isValidSlug(slug);

  function onMosqueNameChange(value: string) {
    setMosqueName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function onSlugChange(value: string) {
    setSlugEdited(true);
    // Keep a trailing dash while typing — stripping it mid-word makes the
    // field fight the user. `slugify` on blur cleans it up.
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-/, ""));
  }

  const plans: { id: PlanId; price: string; features: string[] }[] = [
    {
      id: "starter",
      price: t("free"),
      features: [tp("starterF1"), tp("starterF2"), tp("starterF3")],
    },
  ];

  // Steps 2 and 3 no longer show the plan cards, so carry the choice forward
  // visibly — otherwise the price is out of sight when the card is entered.
  const planSummary = (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-card-border bg-accent/5 px-3 py-2 text-xs">
      <span className="font-semibold">
        {tp(`${plan}Name` as Parameters<typeof tp>[0])}
        <span className="ml-1.5 font-normal text-muted">
          {plans.find((p) => p.id === plan)?.price}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setStep("plan")}
        className="shrink-0 font-semibold text-accent hover:underline"
      >
        {t("changePlan")}
      </button>
    </div>
  );

  return (
    <>
      <PublicHeader hideNavLinks />
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className={`w-full ${step === "plan" ? "max-w-2xl" : "max-w-md"}`}>
          {/* Hero intro */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t("onboardingHeroTitle")}</h1>
            <p className="mt-2 text-sm text-muted">{t("onboardingHeroSubtitle")}</p>
          </div>

          {/* Progress bar */}
          <div className="mb-8 space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>
                {t("step", { current: stepIndex + 1, total: totalSteps })}
                <span className="ml-1.5 font-medium text-foreground">{stepLabel}</span>
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-card-border overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-8 space-y-6">

            {/* Step 1 — Plan selection */}
            {step === "plan" && (
              <>
                <div>
                  <h2 className="text-xl font-semibold">{t("planTitle")}</h2>
                  <p className="mt-1 text-sm text-muted">{t("planSubtitle")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {plans.map((p) => {
                    const isSelected = plan === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setPlan(p.id)}
                        className={`text-left rounded-xl border p-5 flex flex-col gap-3 transition-all ${
                          isSelected
                            ? "border-accent ring-2 ring-accent bg-accent/5"
                            : "border-card-border hover:border-accent/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{tp(`${p.id}Name` as Parameters<typeof tp>[0])}</p>
                            <p className="text-lg font-semibold mt-0.5">{p.price}</p>
                          </div>
                          {isSelected && (
                            <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-primary-foreground">
                              <Check className="h-3 w-3" />
                              <span className="sr-only">{t("selected")}</span>
                            </span>
                          )}
                        </div>
                        <ul className="space-y-1.5">
                          {p.features.map((f) => (
                            <li key={f} className="flex items-start gap-1.5 text-xs text-muted">
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setStep("mosque")}
                  className={cn(buttonVariants({ size: "xl" }), "w-full")}
                >
                  {t("continue")}
                </button>
              </>
            )}

            {/* Step 2 — Mosque info */}
            {step === "mosque" && (
              <>
                <div>
                  <h2 className="text-xl font-semibold">{t("mosqueTitle")}</h2>
                  <p className="mt-1 text-sm text-muted">{t("mosqueSubtitle")}</p>
                </div>
                {planSummary}
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium">{t("mosqueName")}</span>
                    <input
                      autoFocus
                      value={mosqueName}
                      onChange={(e) => onMosqueNameChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && mosqueStepValid) setStep("admin"); }}
                      placeholder={t("mosqueNamePlaceholder")}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">
                      {t("mosqueSlug")}{" "}
                      <span className="font-normal text-muted text-xs">({t("mosqueSlugHint")})</span>
                    </span>
                    <div className="mt-1 flex items-center rounded-lg border border-card-border bg-background overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                      <input
                        value={slug}
                        onChange={(e) => onSlugChange(e.target.value)}
                        onBlur={() => setSlug(slugify(slug))}
                        onKeyDown={(e) => { if (e.key === "Enter" && mosqueStepValid) setStep("admin"); }}
                        placeholder="meine-moschee"
                        className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
                      />
                      <span className="shrink-0 pr-3 text-xs text-muted">.mekteb.de</span>
                    </div>
                    {slug.length > 0 && !isValidSlug(slug) && (
                      <span className="mt-1 block text-xs text-muted">{t("mosqueSlugInvalid")}</span>
                    )}
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!mosqueStepValid}
                    onClick={() => setStep("admin")}
                    className={cn(buttonVariants({ size: "xl" }), "w-full")}
                  >
                    {t("continue")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("plan")}
                    className="w-full rounded-xl px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    ← {t("back")}
                  </button>
                </div>
              </>
            )}

            {/* Step 3 — Admin account */}
            {step === "admin" && (
              <form action={formAction} className="space-y-4">
                {/* Pass all collected values as hidden fields */}
                <input type="hidden" name="mosque_name" value={mosqueName} />
                <input type="hidden" name="mosque_slug" value={slug} />
                <input type="hidden" name="timezone"    value="Europe/Berlin" />
                <input type="hidden" name="plan"        value={plan} />
                <div>
                  <h2 className="text-xl font-semibold">{t("adminTitle")}</h2>
                  <p className="mt-1 text-sm text-muted">{t("adminSubtitle")}</p>
                </div>
                {planSummary}
                <label className="block">
                  <span className="text-sm font-medium">{t("email")}</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="admin@mosque.org"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">{t("password")}</span>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder={t("passwordPlaceholder")}
                    className={inputClass}
                  />
                </label>
                {result && "error" in result && (
                  <p role="alert" className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger-fg">
                    {result.error}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className={cn(buttonVariants({ size: "xl" }), "w-full")}
                  >
                    {pending ? t("creating") : t("createAccount")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("mosque")}
                    className="w-full rounded-xl px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    ← {t("back")}
                  </button>
                </div>
                <p className="text-xs text-center text-muted">
                  {plan === "starter" ? t("starterNote") : t("paidNote")}
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
