import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import ApiDocsClient from "@/components/docs/ApiDocsClient";
import ThemeToggle from "@/components/ThemeToggle";
import { MosqueIcon, GithubIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "API Reference · Mekteb",
  description: "Interactive reference for the Mekteb API (/api/v1).",
};

export default async function ApiDocsPage() {
  const locale = await getLocale();
  const t = await getTranslations("Index");

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="sticky top-0 z-30 border-b border-card-border/60 bg-background/85 backdrop-blur-md shadow-sm shadow-accent/2">
        <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/5 border border-accent/15">
              <MosqueIcon className="h-5.5 w-5.5 text-accent" />
            </div>
            <div className="leading-tight">
              <span className="text-xl font-semibold tracking-tight">Mekteb</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                {t("apiDocs")}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Scalar's own toggle is hidden so it can follow the app theme —
                this is the control that drives both. */}
            <ThemeToggle />
            <a
              href="/api/docs/openapi.json"
              className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold hover:border-accent/40 hover:text-accent transition-colors"
            >
              openapi.json
            </a>
            <a
              href="https://github.com/sanid/mekteb"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="rounded-xl p-2 text-muted hover:text-foreground transition-colors"
            >
              <GithubIcon className="h-5 w-5" />
            </a>
            <Link
              href="/"
              className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold hover:border-accent/40 hover:text-accent transition-colors"
            >
              {locale === "de" ? "← Startseite" : "← Landing page"}
            </Link>
          </div>
        </div>
      </header>

      {/* No wrapper width or padding: Scalar lays out its own full-bleed
          sidebar + content grid and caps the content column itself. Boxing it
          in makes the reference look like an embedded iframe. */}
      <main>
        <ApiDocsClient locale={locale} />
      </main>
    </div>
  );
}
