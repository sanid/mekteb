"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { MosqueIcon, StarBulletIcon } from "./icons";
import { operatorConfig } from "@/lib/operator-config";

export default function PublicFooter() {
  const t = useTranslations("Index");

  return (
    <footer className="border-t border-card-border/60 bg-surface/50 mt-auto w-full">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-8 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-accent/5 border border-accent/15">
              <MosqueIcon className="h-4.5 w-4.5 text-accent" />
            </div>
            <span className="font-semibold text-[17px] text-foreground tracking-tight">Mekteb</span>
          </div>
          <p className="text-muted leading-relaxed text-[13px]">{t("footerText")}</p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-4 text-[15px]">{t("footer_product")}</h4>
          <ul className="space-y-2.5 text-[13px] text-muted font-medium">
            <li>
              <Link href="/#features" className="hover:text-accent transition-colors">
                {t("nav_features")}
              </Link>
            </li>
            <li>
              <Link href="/#how" className="hover:text-accent transition-colors">
                {t("nav_how")}
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-accent transition-colors">
                {t("nav_pricing")}
              </Link>
            </li>
            <li>
              <Link href="/demo" className="hover:text-accent transition-colors">
                {t("tryDemo")}
              </Link>
            </li>
            <li>
              {/* Static file served from public/docs — not an app route, so a
                  plain anchor is correct here. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/docs/index.html" className="hover:text-accent transition-colors">
                {t("handbook")}
              </a>
            </li>
            <li>
              <Link href="/docs/api" className="hover:text-accent transition-colors">
                {t("apiDocs")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-4 text-[15px]">{t("footer_legal")}</h4>
          <ul className="space-y-2.5 text-[13px] text-muted font-medium">
            <li>
              <Link
                href="/privacy"
                className="hover:text-accent transition-colors"
              >
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="hover:text-accent transition-colors"
              >
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link
                href="/impressum"
                className="hover:text-accent transition-colors"
              >
                {t("impressum")}
              </Link>
            </li>
          </ul>
        </div>
        {operatorConfig.email ? (
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-[15px]">{t("footer_contact")}</h4>
            <p className="text-[13px] text-muted font-medium">
              <a
                href={`mailto:${operatorConfig.email}`}
                className="hover:text-accent transition-colors"
              >
                {operatorConfig.email}
              </a>
            </p>
          </div>
        ) : null}
      </div>
      <div className="border-t border-card-border/60 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 flex items-center justify-center gap-1 text-accent/40 select-none pointer-events-none">
          <StarBulletIcon className="h-3 w-3 rotate-45" />
          <div className="h-1 w-1 rounded-full bg-accent/20" />
          <StarBulletIcon className="h-3 w-3 rotate-45" />
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-xs text-muted text-center font-medium">
          © {new Date().getFullYear()} Mekteb. {t("footer_rights")}
        </div>
      </div>
    </footer>
  );
}
