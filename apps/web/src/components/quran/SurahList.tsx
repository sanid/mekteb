"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { SurahMeta } from "@/lib/quran-api";

export function SurahList({
  surahs,
  labels,
}: {
  surahs: SurahMeta[];
  labels: {
    title: string;
    meccan: string;
    median: string;
    verses: string;
  };
}) {
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-success-fg" />
        <h1 className="text-lg font-semibold">{labels.title}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {surahs.map((s) => (
          <Link
            key={s.number}
            href={`quran/${s.number}`}
            className="flex items-center gap-3 rounded-xl border border-card-border bg-card px-4 py-3 hover:border-accent/50 hover:bg-accent-subtle transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success-fg text-xs font-semibold">
              {s.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{s.englishName}</span>
                <span className="font-arabic text-sm text-muted truncate" lang="ar" dir="rtl">
                  {s.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>
                  {s.numberOfAyahs} {labels.verses}
                </span>
                <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[11px]">
                  {s.revelationType === "Meccan" ? labels.meccan : labels.median}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
