"use client";

import { TRANSLATION_OPTIONS } from "@/lib/quran-api";

export function TranslationSelector({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="translation" className="text-xs text-muted whitespace-nowrap">
        {label}
      </label>
      <select
        id="translation"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background"
      >
        {TRANSLATION_OPTIONS.map((t) => (
          <option key={t.identifier} value={t.identifier}>
            {t.englishName}
          </option>
        ))}
      </select>
    </div>
  );
}
