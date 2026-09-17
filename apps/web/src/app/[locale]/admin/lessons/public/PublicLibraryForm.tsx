"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, ExternalLink } from "lucide-react";

import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { inputCls } from "@/components/FormField";
import { buttonVariants } from "@/components/ui/button";
import { LIBRARY_FONTS, LIBRARY_THEMES, type LibraryFont, type LibraryTheme } from "@/lib/public-library-config";
import { cn } from "@/lib/utils";
import { useIsHydrated } from "@/hooks/use-is-hydrated";

import { savePublicLibrary } from "./actions";

export type PublicLibraryFormValues = {
  isEnabled: boolean;
  title: string;
  intro: string;
  accentColor: string | null;
  font: LibraryFont;
  theme: LibraryTheme;
  showLogo: boolean;
  subdomain: string;
  baseLocale: string;
};

const PREVIEW: Record<LibraryTheme, { bg: string; fg: string; card: string; border: string; muted: string }> = {
  system: { bg: "var(--background)", fg: "var(--foreground)", card: "var(--card)", border: "var(--card-border)", muted: "var(--muted)" },
  light: { bg: "#fcfaf6", fg: "#1c2420", card: "#ffffff", border: "#e6dfd3", muted: "#5c685f" },
  sepia: { bg: "#f5ecd9", fg: "#3b2f22", card: "#fbf5e8", border: "#e2d3b5", muted: "#7a6a55" },
  dark: { bg: "#090e0c", fg: "#f2f7f4", card: "#0f1613", border: "#1b2620", muted: "#809085" },
};
const FONT_CLASS: Record<LibraryFont, string> = {
  sans: "",
  serif: "library-font-serif",
  rounded: "library-font-rounded",
};

export function PublicLibraryForm({
  slug,
  mosqueName,
  brandColor,
  rootDomain,
  initial,
}: {
  rootDomain: string;
  slug: string;
  mosqueName: string;
  brandColor: string;
  initial: PublicLibraryFormValues;
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const [enabled, setEnabled] = useState(initial.isEnabled);
  const [title, setTitle] = useState(initial.title);
  const [useAccent, setUseAccent] = useState(initial.accentColor !== null);
  const [accent, setAccent] = useState(initial.accentColor ?? brandColor);
  const [font, setFont] = useState(initial.font);
  const [theme, setTheme] = useState(initial.theme);
  const [copied, setCopied] = useState(false);
  const [subdomain, setSubdomain] = useState(initial.subdomain);

  const hydrated = useIsHydrated();
  const origin = hydrated ? window.location.origin : "";
  const path = `/${locale}/library/${slug}`;
  // The saved subdomain is the link to share; until then the path link.
  const url = initial.subdomain ? `https://${initial.subdomain}.${rootDomain}` : `${origin}${path}`;
  const color = useAccent ? accent : brandColor;
  const p = PREVIEW[theme];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is still visible to copy by hand */
    }
  }

  const themeLabels: Record<LibraryTheme, string> = {
    system: t("publicLibraryThemeSystem"),
    light: t("publicLibraryThemeLight"),
    dark: t("publicLibraryThemeDark"),
    sepia: t("publicLibraryThemeSepia"),
  };
  const fontLabels: Record<LibraryFont, string> = {
    sans: t("publicLibraryFontSans"),
    serif: t("publicLibraryFontSerif"),
    rounded: t("publicLibraryFontRounded"),
  };

  return (
    <ActionForm
      action={savePublicLibrary}
      successMessage={t("settingsSaved")}
      resetOnSuccess={false}
      className="space-y-6"
    >
      {/* Visibility + link */}
      <section className="space-y-4 rounded-xl border border-card-border bg-card p-5">
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block font-medium">{t("publicLibraryEnable")}</span>
            <span className="mt-0.5 block text-sm text-muted">{t("publicLibraryEnableHint")}</span>
          </span>
          <input
            type="checkbox"
            name="is_enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
          />
        </label>
        {enabled ? (
          <div className="space-y-2 border-t border-card-border pt-4">
            <span className="text-sm font-medium">{t("publicLibraryLink")}</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input readOnly value={url} className={cn(inputCls, "font-mono text-xs")} onFocus={(e) => e.target.select()} />
              <div className="flex gap-2">
                <button type="button" onClick={copy} className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t("publicLibraryCopied") : t("publicLibraryCopy")}
                </button>
                {initial.isEnabled ? (
                  <a href={initial.subdomain ? url : path} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
                    <ExternalLink className="h-4 w-4" />
                    {t("publicLibraryOpen")}
                  </a>
                ) : null}
              </div>
            </div>
            <label className="block pt-2">
              <span className="text-sm font-medium">{t("publicLibrarySubdomain")}</span>
              <div className="mt-1 flex items-stretch">
                <span className="flex items-center rounded-l-lg border border-r-0 border-card-border bg-surface px-3 text-sm text-muted">https://</span>
                <input
                  name="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder={slug ? `${slug}-bibliothek` : "ilmihal"}
                  maxLength={63}
                  className={cn(inputCls, "rounded-none font-mono text-sm")}
                />
                <span className="flex items-center rounded-r-lg border border-l-0 border-card-border bg-surface px-3 text-sm text-muted">.{rootDomain}</span>
              </div>
              <span className="mt-1 block text-xs text-muted">{t("publicLibrarySubdomainHint")}</span>
            </label>
            <p className="text-xs text-muted">{t("publicLibraryPublishedOnly")}</p>
          </div>
        ) : null}
      </section>

      {/* Content + styling */}
      <section className="grid gap-6 rounded-xl border border-card-border bg-card p-5 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">{t("publicLibraryTitle")}</span>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mosqueName}
              maxLength={120}
              className={cn(inputCls, "mt-1")}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("publicLibraryIntro")}</span>
            <textarea
              name="intro"
              rows={3}
              defaultValue={initial.intro}
              maxLength={2000}
              placeholder={t("publicLibraryIntroPlaceholder")}
              className={cn(inputCls, "mt-1 resize-none")}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">{t("publicLibraryBaseLocale")}</span>
            <select name="base_locale" defaultValue={initial.baseLocale} className={cn(inputCls, "mt-1")}>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="bs">Bosanski</option>
              <option value="tr">Türkçe</option>
            </select>
            <span className="mt-1 block text-xs text-muted">{t("publicLibraryBaseLocaleHint")}</span>
          </label>

          <fieldset>
            <legend className="text-sm font-medium">{t("publicLibraryTheme")}</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {LIBRARY_THEMES.map((id) => (
                <label
                  key={id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    theme === id ? "border-accent bg-accent-subtle" : "border-card-border",
                  )}
                >
                  <input type="radio" name="theme" value={id} checked={theme === id} onChange={() => setTheme(id)} className="sr-only" />
                  <span className="h-4 w-4 rounded-full border" style={{ background: PREVIEW[id].bg, borderColor: PREVIEW[id].border }} />
                  {themeLabels[id]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">{t("publicLibraryFont")}</legend>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {LIBRARY_FONTS.map((id) => (
                <label
                  key={id}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2 text-center text-sm",
                    FONT_CLASS[id],
                    font === id ? "border-accent bg-accent-subtle" : "border-card-border",
                  )}
                >
                  <input type="radio" name="font_style" value={id} checked={font === id} onChange={() => setFont(id)} className="sr-only" />
                  <span className="block text-lg leading-none">Aa</span>
                  <span className="mt-1 block text-xs text-muted">{fontLabels[id]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="use_accent" checked={useAccent} onChange={(e) => setUseAccent(e.target.checked)} />
              {t("publicLibraryCustomColor")}
            </label>
            {useAccent ? (
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-card-border bg-transparent" />
                <input name="accent_color" value={accent} onChange={(e) => setAccent(e.target.value)} pattern="#[0-9a-fA-F]{6}" className={cn(inputCls, "w-32 font-mono text-xs")} />
              </div>
            ) : (
              <p className="text-xs text-muted">{t("publicLibraryBrandColorHint")}</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="show_logo" defaultChecked={initial.showLogo} />
            {t("publicLibraryShowLogo")}
          </label>
        </div>

        {/* Live preview */}
        <div>
          <span className="text-sm font-medium">{t("publicLibraryPreview")}</span>
          <div
            className={cn("mt-1 overflow-hidden rounded-xl border text-[11px]", FONT_CLASS[font])}
            style={{ background: p.bg, color: p.fg, borderColor: p.border }}
          >
            <div className="flex items-center gap-2 border-b px-3 py-2 font-semibold" style={{ borderColor: p.border }}>
              <span className="h-4 w-4 rounded" style={{ background: color }} />
              {title || mosqueName}
            </div>
            <div className="flex gap-3 p-3">
              <div className="w-24 shrink-0 space-y-1.5">
                <div className="font-semibold">Aqidah</div>
                <div className="border-l-2 pl-2 font-medium" style={{ borderColor: color, color }}>Iman</div>
                <div className="border-l-2 pl-2" style={{ borderColor: "transparent", color: p.muted }}>Islam</div>
                <div className="border-l-2 pl-2" style={{ borderColor: "transparent", color: p.muted }}>Ihsan</div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="text-[9px] font-semibold uppercase" style={{ color }}>Aqidah</div>
                <div className="text-base font-semibold leading-tight">Iman</div>
                <div className="rounded-md border p-2" style={{ background: p.card, borderColor: p.border }}>
                  <div className="h-1.5 rounded-full" style={{ background: p.border }}>
                    <div className="h-1.5 w-1/3 rounded-full" style={{ background: color }} />
                  </div>
                </div>
                <div className="space-y-1" style={{ color: p.muted }}>
                  <div className="h-1.5 rounded-full" style={{ background: p.border }} />
                  <div className="h-1.5 w-5/6 rounded-full" style={{ background: p.border }} />
                  <div className="h-1.5 w-2/3 rounded-full" style={{ background: p.border }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SubmitButton>{t("save")}</SubmitButton>
    </ActionForm>
  );
}
