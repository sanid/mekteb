"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { FeatureIcon, type FeatureIconType } from "./FeatureIcon";

export type Feature = { key: string; icon: FeatureIconType };

/**
 * The landing-page features grid.
 *
 * Shows the first `visible` cards and hides the rest behind a toggle, so the
 * page stays scannable and the full catalogue is one click away. The toggle
 * reveals them in the same grid — no reflow, the extra cards just appear.
 */
export function FeaturesGrid({
  features,
  visible,
}: {
  features: Feature[];
  visible: number;
}) {
  const t = useTranslations("Index");
  const [expanded, setExpanded] = useState(false);

  const shown = expanded ? features : features.slice(0, visible);
  const hasMore = features.length > visible;

  return (
    <div className="space-y-8">
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ key, icon }) => (
          <div key={key} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
              <FeatureIcon type={icon} className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight text-foreground">
                {t(`feature_${key}_title`)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {t(`feature_${key}_desc`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasMore ? (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={buttonVariants({ variant: "outline" })}
          >
            {expanded ? t("featuresShowLess") : t("featuresShowMore")}
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
