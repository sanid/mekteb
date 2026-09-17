"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GALLERY: { role: string; files: string[] }[] = [
  {
    role: "admin",
    files: [
      "01-uebersicht", "02-kalender", "03-gruppen", "04-schueler", "05-lehrer",
      "06-eltern", "07-lektionen", "08-koran", "09-pruefungen",
      "10-schriftliche-tests", "11-ankuendigungen", "12-nachrichten",
      "13-benachrichtigungen", "14-protokoll", "15-jahresbericht",
      "16-sicherheit", "17-dsgvo-anfragen", "18-einstellungen",
    ],
  },
  {
    role: "teacher",
    files: [
      "01-uebersicht", "02-meine-gruppen", "03-lernbibliothek", "04-koran",
      "05-aktuelle-pruefungsergebnisse", "06-alle-notizen", "07-nachrichten",
      "08-benachrichtigungen", "09-ankuendigungen",
    ],
  },
  {
    role: "parent",
    files: [
      "01-uebersicht", "02-meine-kinder", "03-kalender", "04-lernbibliothek",
      "05-koran", "06-nachrichten", "07-benachrichtigungen",
      "08-ankuendigungen",
    ],
  },
  {
    role: "student",
    files: [
      "01-uebersicht", "02-hausaufgaben", "03-anwesenheit", "04-kalender",
      "05-bevorstehende-pruefungen", "06-lernbibliothek", "07-koran",
      "08-ankuendigungen", "09-benachrichtigungen",
    ],
  },
  {
    role: "examiner",
    files: [
      "01-uebersicht", "02-aktuelle-pruefungen", "03-schriftliche-tests",
      "04-nachrichten", "05-benachrichtigungen",
    ],
  },
  {
    role: "platform-admin",
    files: [
      "01-uebersicht", "02-moscheen", "03-abrechnung", "04-dsgvo-loeschprotokoll",
    ],
  },
];

export default function ScreenshotsGallery() {
  const t = useTranslations("Index");
  const tDemo = useTranslations("Demo");

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);

  const groups = useMemo(() => {
    const visible = filter
      ? GALLERY.filter((g) => g.role === filter)
      : GALLERY;
    return visible.map((g) => ({
      ...g,
      label: tDemo(g.role),
      items: g.files.map((file, i) => ({
        file,
        src: `/screenshots/${g.role}/${file}.png`,
        alt: `${tDemo(g.role)} · ${i + 1}`,
      })),
    }));
  }, [filter, tDemo]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewer !== null) setViewer(null);
        else setOpen(false);
      }
      if (viewer !== null && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        setViewer((v) => (v === null ? v : (v + dir + flat.length) % flat.length));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, viewer, flat.length]);

  const current = viewer !== null ? flat[viewer] : null;

  return (
    <section id="screenshots" className="scroll-mt-20 relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-accent">{t("galleryEyebrow")}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("galleryTitle")}
            </h2>
            <p className="mt-3 text-muted">{t("gallerySubtitle")}</p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "shrink-0")}
          >
            <ZoomIn className="h-4 w-4" />
            {t("galleryCta")}
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t("galleryTitle")}
        >
          <div
            className="absolute inset-0 bg-background/85 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-card-border bg-surface shadow-2xl">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-bold tracking-tight text-foreground">
                  {t("galleryTitle")}
                </h3>
                <p className="text-xs text-muted">
                  {current
                    ? `${current.alt} · ${viewer! + 1} / ${flat.length}`
                    : t("gallerySubtitle")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {viewer !== null && (
                  <button
                    type="button"
                    onClick={() => setViewer(null)}
                    className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    {t("galleryGrid")}
                  </button>
                )}

                <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-card-border p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilter(null);
                      setViewer(null);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                      filter === null
                        ? "bg-accent text-white"
                        : "text-muted hover:text-accent"
                    }`}
                  >
                    {t("galleryAll")}
                  </button>
                  {GALLERY.map((g) => {
                    const active = filter === g.role;
                    return (
                      <button
                        key={g.role}
                        type="button"
                        onClick={() => {
                          setFilter(g.role);
                          setViewer(null);
                        }}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                          active
                            ? "bg-accent text-white"
                            : "text-muted hover:text-accent"
                        }`}
                      >
                        {tDemo(g.role)}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("galleryClose")}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-card hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {current ? (
              <div className="relative flex-1 flex flex-col min-h-0">
                <div className="relative flex-1 min-h-0 bg-card/50 p-4 sm:p-6">
                  <div className="relative h-full w-full">
                    <Image
                      src={current.src}
                      alt={current.alt}
                      fill
                      sizes="(max-width: 1280px) 100vw, 1200px"
                      className="object-contain"
                      priority
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setViewer((viewer! - 1 + flat.length) % flat.length)
                    }
                    aria-label={t("galleryPrev")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-card-border bg-background/90 p-2.5 text-foreground shadow-lg transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewer((viewer! + 1) % flat.length)}
                    aria-label={t("galleryNext")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-card-border bg-background/90 p-2.5 text-foreground shadow-lg transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <footer className="flex items-center justify-between gap-4 border-t border-card-border px-5 py-3">
                  <div className="text-sm font-semibold text-foreground">
                    {current.alt}
                  </div>
                  <div className="text-xs text-muted tabular-nums">
                    {viewer! + 1} / {flat.length}
                  </div>
                </footer>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {groups.map((group) => (
                  <div key={group.role} className={group !== groups[0] ? "mt-10" : undefined}>
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
                      <span className="inline-block h-px w-6 bg-accent/40" />
                      {group.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {group.items.map((item) => {
                        const index = flat.indexOf(item);
                        return (
                          <button
                            key={item.file}
                            type="button"
                            onClick={() => setViewer(index)}
                            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-card-border bg-card focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
                          >
                            <Image
                              src={item.src}
                              alt={item.alt}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all duration-200 group-hover:bg-foreground/10 group-hover:opacity-100">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg">
                                <ZoomIn className="h-4 w-4" />
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
