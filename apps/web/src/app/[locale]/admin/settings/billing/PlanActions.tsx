"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import { cancelSubscription, switchPlan } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The action on a plan card.
 *
 * Decided here, in one place, because the three cases have different UX:
 *   * no live subscription + paid plan      → checkout (collects the card)
 *   * live subscription + another paid plan → switch the price on the same
 *     Stripe subscription (upgrade or downgrade, prorated)
 *   * live subscription + free (starter)    → downgrade at the end of the
 *     billing period (records `pending_plan_id`; the webhook applies it)
 */
export function PlanActions({
  planId,
  planName,
  isFree,
  hasPaidSub,
  isUpgrade,
  href,
}: {
  planId: string;
  planName: string;
  /** Target plan costs nothing (starter). */
  isFree: boolean;
  /** The mosque has a live paid subscription. */
  hasPaidSub: boolean;
  /** Target paid plan is more expensive than the current one. */
  isUpgrade: boolean;
  /** Checkout URL for the no-subscription upgrade case. */
  href: string;
}) {
  const t = useTranslations("Billing");
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (isFree) {
    if (!hasPaidSub) return null;
    if (confirming) {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted">{t("confirmDowngradeToFree")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                startTransition(async () => {
                  const r = await cancelSubscription();
                  if ("error" in r) toast.error(r.error);
                  else toast.success(t("downgradeScheduled"));
                });
              }}
              className={cn(buttonVariants({ size: "xl" }), "w-full")}
            >
              {t("confirmDowngrade")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={cn(buttonVariants({ variant: "ghost", size: "xl" }), "w-full")}
            >
              {t("keepPlan")}
            </button>
          </div>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={cn(buttonVariants({ size: "xl", variant: "outline" }), "w-full")}
      >
        {t("downgradeToFree")}
      </button>
    );
  }

  if (!hasPaidSub) {
    return (
      <Link href={href} className={cn(buttonVariants({ size: "xl" }), "w-full text-center")}>
        {t("upgradeTo", { plan: planName })}
      </Link>
    );
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted">{t("confirmPlanSwitch")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              startTransition(async () => {
                const r = await switchPlan(planId);
                if ("error" in r) toast.error(r.error);
                else toast.success(t("planSwitched"));
              });
            }}
            className={cn(buttonVariants({ size: "xl" }), "w-full")}
          >
            {t("confirmSwitch")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={cn(buttonVariants({ variant: "ghost", size: "xl" }), "w-full")}
          >
            {t("keepPlan")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        // Upgrades are immediate and harmless; only downgrades confirm.
        if (isUpgrade) {
          startTransition(async () => {
            const r = await switchPlan(planId);
            if ("error" in r) toast.error(r.error);
            else toast.success(t("planSwitched"));
          });
        } else {
          setConfirming(true);
        }
      }}
      className={cn(
        buttonVariants({ size: "xl", variant: isUpgrade ? "default" : "outline" }),
        "w-full",
      )}
    >
      {isUpgrade ? t("upgradeTo", { plan: planName }) : t("downgradeTo", { plan: planName })}
    </button>
  );
}
