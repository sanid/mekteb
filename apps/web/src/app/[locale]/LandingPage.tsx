"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { MosqueIcon, GithubIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";
import { FeatureIcon } from "@/components/landing/FeatureIcon";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import ScreenshotsGallery from "@/components/landing/ScreenshotsGallery";
import { HeroPattern } from "@/components/landing/HeroPattern";
import {
  AnnouncementDemo,
  AttendanceDemo,
  ExamDemo,
  HifzDemo,
  HomeworkDemo,
  MessagesDemo,
} from "@/components/landing/Demos";

function SectionHeading({
  label,
  title,
  subtitle,
}: {
  label?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      {label ? <p className="text-sm font-semibold text-accent">{label}</p> : null}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-muted">{subtitle}</p> : null}
    </div>
  );
}

/** Text beside a live demo, alternating sides row by row. */
function TourRows({
  items,
  offset = 0,
}: {
  items: { key: string; demo: React.ReactNode }[];
  offset?: number;
}) {
  const t = useTranslations("Index");
  return (
    <div className="space-y-16 sm:space-y-24">
      {items.map(({ key, demo }, i) => (
        <div key={key} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <div className={cn("max-w-md", (i + offset) % 2 === 1 && "lg:order-2")}>
            <h3 className="text-2xl font-semibold tracking-tight">{t(`tour_${key}_title`)}</h3>
            <p className="mt-3 leading-relaxed text-muted">{t(`tour_${key}_desc`)}</p>
          </div>
          <div className="rounded-2xl bg-surface p-3 sm:p-5">{demo}</div>
        </div>
      ))}
    </div>
  );
}

const container = "mx-auto max-w-6xl px-4 sm:px-6";
const section = "border-t border-card-border py-16 sm:py-24";

export default function Home() {
  const t = useTranslations("Index");
  const tPricing = useTranslations("Pricing");
  const [showMore, setShowMore] = useState(false);

  // Attendance, Quran and messaging are shown as live demos above, so the grid
  // covers the rest.
  const features = [
    { key: "lessons", icon: "lessons" as const },
    { key: "homework", icon: "homework" as const },
    { key: "exams", icon: "exams" as const },
    { key: "groups", icon: "groups" as const },
    { key: "calendar", icon: "calendar" as const },
    { key: "parents", icon: "parents" as const },
    { key: "students", icon: "students" as const },
    { key: "announcements", icon: "announcements" as const },
    { key: "audio", icon: "audio" as const },
  ];
  const steps = ["1", "2", "3"] as const;
  const faqs = ["1", "2", "3", "4"] as const;

  // Beta: only the free plan can be signed up for. "Verein" is announced
  // without a price or a signup button.
  const plans = [
    {
      id: "starter",
      name: tPricing("starterName"),
      description: tPricing("starterDesc"),
      features: [tPricing("starterF1"), tPricing("starterF2"), tPricing("starterF3")],
      available: true,
    },
    {
      id: "verein",
      name: tPricing("vereinName"),
      description: tPricing("vereinDesc"),
      features: [tPricing("vereinF1"), tPricing("vereinF2"), tPricing("vereinF3")],
      available: false,
    },
  ];

  return (
    <main className="flex flex-1 flex-col bg-background text-foreground antialiased">
      <PublicHeader />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20">
        <HeroPattern />
        <div className={cn(container, "relative grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16")}>
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding" className={buttonVariants({ size: "lg" })}>
                {t("pricingCta")}
                <ArrowRight />
              </Link>
              <Link href="/demo" className={buttonVariants({ size: "lg", variant: "outline" })}>
                {t("tryDemo")}
              </Link>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {(["trust1", "trust2", "trust3"] as const).map((k) => (
                <div key={k} className="flex items-baseline gap-1.5">
                  <dt className="font-semibold text-foreground">{t(`${k}_value`)}</dt>
                  <dd className="text-muted">{t(`${k}_label`)}</dd>
                </div>
              ))}
              <a
                href="https://github.com/sanid/mekteb"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-foreground underline-offset-4 hover:text-accent hover:underline"
              >
                <GithubIcon className="h-4 w-4" />
                {t("githubLabel")}
              </a>
            </dl>
          </div>

          <div>
            <div className="rounded-2xl bg-surface p-3 sm:p-5">
              <AttendanceDemo />
            </div>
            <p className="mt-3 text-center text-xs text-muted">{t("heroDemoHint")}</p>
          </div>
        </div>
      </section>

      {/* ── Demos ── */}
      <section id="features" className={cn(section, "scroll-mt-20")}>
        <div className={container}>
          <SectionHeading label={t("tourEyebrow")} title={t("tourTitle")} subtitle={t("tourSubtitle")} />

          <TourRows
            items={[
              { key: "hifz", demo: <HifzDemo /> },
              { key: "messages", demo: <MessagesDemo /> },
            ]}
          />

          {showMore ? (
            <div className="mt-16 sm:mt-24">
              <TourRows
                offset={2}
                items={[
                  { key: "homework", demo: <HomeworkDemo /> },
                  { key: "exams", demo: <ExamDemo /> },
                  { key: "announcements", demo: <AnnouncementDemo /> },
                ]}
              />
            </div>
          ) : null}

          <div className="mt-14 flex justify-center">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              {showMore ? t("tourLess") : t("tourMore")}
              <ChevronDown className={cn("transition-transform", showMore && "rotate-180")} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Everything else ── */}
      <section className={section}>
        <div className={container}>
          <SectionHeading title={t("featuresTitle")} subtitle={t("featuresSubtitle")} />
          <FeaturesGrid features={features} visible={6} />
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className={cn(section, "scroll-mt-20")}>
        <div className={container}>
          <SectionHeading label={t("howEyebrow")} title={t("howTitle")} subtitle={t("howSubtitle")} />
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((n) => (
              <li key={n} className="border-t-2 border-accent pt-5">
                <span className="text-sm font-semibold tabular-nums text-accent">0{n}</span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{t(`step_${n}_title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`step_${n}_desc`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Platforms ── */}
      <section className={section}>
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-2")}>
          <div>
            <SectionHeading label={t("platformsEyebrow")} title={t("platformsTitle")} subtitle={t("platformsSubtitle")} />
            <ul className="-mt-4 space-y-3 text-sm">
              {(["1", "2", "3"] as const).map((n) => (
                <li key={n} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{t(`platforms_b_${n}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-surface p-3 sm:p-5">
            <div className="aspect-[4/3] rounded-xl border border-card-border bg-card shadow-elevated overflow-hidden relative">
              <div className="relative w-full h-full">
                {/*
                  The admin overview at `/admin`, reproduced rather than
                  invented: the nav order, the four stat tiles and their colours
                  are the ones `admin/layout.tsx` and `admin/page.tsx` actually
                  render. A mockup that shows a product nobody will recognise
                  when they sign in is worse than no mockup.
                */}
                <div className="absolute inset-0 bg-card flex overflow-hidden text-[11px] select-none">
                  {/* Sidebar */}
                  <div className="w-[30%] border-r border-card-border bg-sidebar flex flex-col shrink-0 text-[10px] p-2.5 gap-0.5">
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <MosqueIcon className="h-4 w-4 text-accent shrink-0" />
                      <span className="font-bold text-foreground truncate text-[11px]">Mekteb</span>
                    </div>
                    {[
                      { label: "Übersicht", icon: "overview" as const, active: true },
                      { label: "Kalender", icon: "attendance" as const },
                      { label: "Gruppen", icon: "groups" as const },
                      { label: "Schüler", icon: "students" as const },
                      { label: "Lehrer", icon: "parents" as const },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-md px-1.5 py-1 flex items-center gap-1.5 text-[9.5px] ${
                          item.active
                            ? "bg-accent-subtle text-accent font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.icon === "overview" ? (
                          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                          </svg>
                        ) : (
                          <FeatureIcon type={item.icon} className="h-2.5 w-2.5 shrink-0" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-card flex flex-col min-w-0">
                    <div className="h-8 border-b border-card-border flex items-center px-3 shrink-0">
                      <div className="font-bold text-foreground text-[11px]">Übersicht</div>
                    </div>
                    <div className="p-3 gap-2.5 flex-1 overflow-hidden flex flex-col">
                      {/* One row of four, as md:grid-cols-4 renders it, in the
                          order and colours /admin uses */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { n: 4, label: "Gruppen", icon: "lessons" as const, fg: "text-accent", bg: "bg-accent-subtle" },
                          { n: 13, label: "Schüler", icon: "students" as const, fg: "text-accent", bg: "bg-accent-subtle" },
                          { n: 5, label: "Lehrer", icon: "groups" as const, fg: "text-accent", bg: "bg-accent-subtle" },
                          { n: 8, label: "Eltern", icon: "parents" as const, fg: "text-accent", bg: "bg-accent-subtle" },
                        ].map((tile) => (
                          <div
                            key={tile.label}
                            className={`px-1.5 py-1.5 rounded-lg border border-card-border ${tile.bg}`}
                          >
                            <FeatureIcon
                              type={tile.icon}
                              className={`h-2.5 w-2.5 mb-1 ${tile.fg}`}
                            />
                            <div className={`text-[13px] font-bold leading-none ${tile.fg}`}>
                              {tile.n}
                            </div>
                            <div className="text-[8px] text-muted-foreground mt-0.5 truncate">
                              {tile.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* This week, the way the calendar renders a day */}
                      <div className="rounded-lg border border-card-border overflow-hidden">
                        <div className="px-2 py-1 bg-surface flex items-baseline gap-1.5">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-accent">
                            Samstag
                          </span>
                          <span className="text-[8px] text-muted-foreground">8. Aug</span>
                        </div>
                        {[
                          { time: "10:00", name: "Mekteb I", color: "#0ea5e9" },
                          { time: "11:00", name: "Hifz III", color: "#8b5cf6" },
                          { time: "12:00", name: "Tajweed I", color: "#f59e0b" },
                          { time: "13:00", name: "Mekteb V", color: "#ec4899" },
                        ].map((row) => (
                          <div key={row.name} className="flex items-center gap-1.5 px-2 py-1">
                            <span className="text-[8.5px] font-semibold text-muted-foreground tabular-nums">
                              {row.time}
                            </span>
                            <span
                              className="h-3 w-[2px] rounded-full shrink-0"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className="text-[9px] text-foreground truncate">{row.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Attendance, the one number an admin opens this page for */}
                      <div className="rounded-lg border border-card-border px-2 py-1.5">
                        <div className="flex justify-between text-[8px] text-muted-foreground mb-1">
                          <span>Anwesenheit (7 Tage)</span>
                          <span className="font-bold text-accent">87%</span>
                        </div>
                        <div className="h-1.5 w-full bg-card-border rounded-full overflow-hidden">
                          <div className="h-full bg-accent w-[87%] rounded-full" />
                        </div>
                      </div>

                      {/* Schnellzugriff — the row of shortcuts /admin ends on */}
                      <div>
                        <div className="text-[7.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Schnellzugriff
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { label: "Lehrer hinzufügen", icon: "groups" as const },
                            { label: "Schüler hinzufügen", icon: "students" as const },
                            { label: "Gruppe hinzufügen", icon: "lessons" as const },
                            { label: "Elternteil hinzufügen", icon: "parents" as const },
                          ].map((action) => (
                            <div
                              key={action.label}
                              className="rounded-md border border-card-border px-1.5 py-1 flex items-center gap-1"
                            >
                              <FeatureIcon
                                type={action.icon}
                                className="h-2 w-2 text-accent shrink-0"
                              />
                              <span className="text-[7.5px] text-muted-foreground truncate">
                                {action.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/*
                  The app's home screen after the navigation restructure: the
                  two header actions, the stat tiles, "Meine Gruppen", and the
                  three-tab bar a teacher actually sees.
                */}
                <div className="absolute bottom-3 right-3 w-[112px] sm:w-[124px] aspect-[9/19.5] rounded-[1.6rem] border-[5px] border-foreground/90 bg-background shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col text-[9px] select-none z-20">
                  {/* Dynamic-island pill rather than a notch bar */}
                  <div className="shrink-0 h-5 flex items-center justify-center">
                    <div className="h-1.5 w-8 rounded-full bg-foreground/80" />
                  </div>

                  <div className="flex-1 px-2 flex flex-col gap-1.5 overflow-hidden">
                    {/* Greeting, role beneath the name, actions on the right */}
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-bold text-[7px] shrink-0">
                        DT
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[6.5px] text-muted-foreground leading-none">
                          Guten Abend,
                        </div>
                        <div className="text-[9px] font-extrabold text-foreground leading-tight">
                          Dev
                        </div>
                        <div className="text-[6px] font-bold text-muted-foreground leading-none">
                          Lehrer
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <div className="h-3.5 w-3.5 rounded-full border border-card-border bg-card" />
                        <div className="relative h-3.5 w-3.5 rounded-full border border-card-border bg-card">
                          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { n: 1, label: "Gruppen" },
                        { n: 2, label: "Schüler" },
                      ].map((tile) => (
                        <div
                          key={tile.label}
                          className="rounded-md border border-card-border bg-card px-1.5 py-1"
                        >
                          <div className="text-[11px] font-extrabold text-foreground leading-none">
                            {tile.n}
                          </div>
                          <div className="text-[6.5px] text-muted-foreground">{tile.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[6px] font-bold uppercase tracking-wider text-muted-foreground">
                      Meine Gruppen
                    </div>
                    <div className="rounded-md border border-card-border bg-card px-1.5 py-1 flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 rounded bg-accent-subtle flex items-center justify-center shrink-0">
                        <FeatureIcon type="groups" className="h-2 w-2 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[7.5px] font-bold text-foreground leading-tight truncate">
                          Klasse 2
                        </div>
                        <div className="text-[6px] text-muted-foreground leading-none">
                          Schüler: 2
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-card-border bg-card px-1.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <FeatureIcon type="attendance" className="h-2.5 w-2.5 text-accent shrink-0" />
                        <div className="text-[7.5px] font-bold text-foreground truncate">
                          Kalender
                        </div>
                      </div>
                      <div className="text-[6px] text-muted-foreground mt-0.5 truncate">
                        Wochenplan der Mektebstunden
                      </div>
                    </div>

                    <div className="rounded-md border border-card-border bg-card px-1.5 py-1.5 flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6h.09A1.65 1.65 0 0010 3.09V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9v.09a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
                      </svg>
                      <div className="text-[7.5px] font-bold text-foreground truncate">
                        Einstellungen
                      </div>
                    </div>
                  </div>

                  {/* Start · Nachrichten · Koran — the teacher's three tabs */}
                  <div className="shrink-0 border-t border-card-border bg-surface flex px-1 py-1 gap-0.5">
                    {[
                      { label: "Start", d: "M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z", active: true },
                      { label: "Nachrichten", d: "M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" },
                      { label: "Koran", d: "M20 15a8 8 0 11-8-11 7 7 0 008 11z" },
                    ].map((tab) => (
                      <div
                        key={tab.label}
                        className={`flex-1 rounded px-0.5 py-0.5 flex flex-col items-center gap-px ${
                          tab.active ? "bg-accent-subtle text-accent" : "text-muted-foreground"
                        }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-2 w-2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinejoin="round"
                        >
                          <path d={tab.d} />
                        </svg>
                        <span className="text-[5px] font-bold leading-none truncate max-w-full">
                          {tab.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-card-border">
        <ScreenshotsGallery />
      </div>

      {/* ── Pricing ── */}
      <section id="pricing" className={cn(section, "scroll-mt-20")}>
        <div className={container}>
          <SectionHeading label={t("pricingEyebrow")} title={t("pricingTitle")} subtitle={t("pricingSubtitle")} />

          <div className="grid max-w-4xl grid-cols-1 items-stretch gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-6",
                  plan.available ? "border-accent ring-1 ring-accent" : "border-card-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold",
                      plan.available ? "bg-accent-subtle text-accent" : "hidden",
                    )}
                  >
                    {plan.available ? tPricing("betaBadge") : null}
                  </span>
                </div>
                <div className="mt-4 h-10 text-4xl font-bold tracking-tight">
                  {plan.available ? tPricing("starterPrice") : null}
                </div>
                <p className="mt-2 text-sm text-muted">{plan.description}</p>
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
                    {tPricing("startFree")}
                  </Link>
                ) : (
                  <div className="mt-8 flex h-10 items-center justify-center rounded-lg border border-dashed border-card-border text-sm text-muted">
                    {tPricing("vereinSoon")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-muted">{tPricing("betaNote")}</p>

          {/* Self-hosting: a real alternative to the plans, so it sits beside them */}
          <div className="mt-10 flex flex-col gap-6 rounded-xl border border-card-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <GithubIcon className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-accent">{t("githubLabel")}</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">{t("pricingSelfHostTitle")}</h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
                {t("pricingSelfHostDesc")}
              </p>
            </div>
            <a
              href="https://github.com/sanid/mekteb"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "shrink-0")}
            >
              <GithubIcon className="h-4 w-4" />
              {t("pricingSelfHostCta")}
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className={cn(section, "scroll-mt-20")}>
        <div className={cn(container, "grid gap-10 lg:grid-cols-[1fr_1.6fr]")}>
          <SectionHeading label={t("faqEyebrow")} title={t("faqTitle")} />
          <div className={cn(listCard, "h-fit bg-card")}>
            {faqs.map((n) => (
              <details key={n} className="group px-5 py-4">
                <summary className="flex list-none items-center justify-between gap-4 font-medium">
                  <span>{t(`faq_${n}_q`)}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t(`faq_${n}_a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-16 sm:pb-24">
        <div className={container}>
          <div className="flex flex-col gap-8 rounded-2xl bg-surface p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <MosqueIcon className="mb-4 h-8 w-8 text-accent" />
              <h2 className="text-3xl font-bold tracking-tight">{t("ctaTitle")}</h2>
              <p className="mt-3 text-muted">{t("ctaSubtitle")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding" className={buttonVariants({ size: "lg" })}>
                {t("pricingCta")}
                <ArrowRight />
              </Link>
              <Link href="/demo" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "bg-card")}>
                {t("tryDemo")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
