"use client";

import { useTranslations } from "next-intl";

import { RECITERS } from "@/lib/quran-api";
import type { QuranSettings, RepeatMode, TextSize } from "@/hooks/use-quran-settings";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const TEXT_SIZES: TextSize[] = ["sm", "base", "lg", "xl", "2xl"];
const REPEATS: RepeatMode[] = ["off", "ayah", "surah"];

const selectCls =
  "rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-surface"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </label>
  );
}

export function QuranSettingsPanel({
  settings,
  update,
}: {
  settings: QuranSettings;
  update: (patch: Partial<QuranSettings>) => void;
}) {
  const t = useTranslations("Quran");

  const sizeLabel: Record<TextSize, string> = {
    sm: t("sizeS"),
    base: t("sizeM"),
    lg: t("sizeL"),
    xl: t("sizeXL"),
    "2xl": t("sizeXXL"),
  };
  const repeatLabel: Record<RepeatMode, string> = {
    off: t("repeatOff"),
    ayah: t("repeatAyah"),
    surah: t("repeatSurah"),
  };

  return (
    <div className="rounded-xl border border-card-border bg-card p-4 space-y-4 shadow-sm">
      {/* Audio */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("audio")}</p>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("reciter")}</span>
          <select className={selectCls} value={settings.reciter} onChange={(e) => update({ reciter: e.target.value })}>
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("speed")}</span>
          <select
            className={selectCls}
            value={settings.playbackRate}
            onChange={(e) => update({ playbackRate: Number(e.target.value) })}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("repeat")}</span>
          <select
            className={selectCls}
            value={settings.repeat}
            onChange={(e) => update({ repeat: e.target.value as RepeatMode })}
          >
            {REPEATS.map((r) => (
              <option key={r} value={r}>{repeatLabel[r]}</option>
            ))}
          </select>
        </label>

        <Toggle checked={settings.continuous} onChange={(v) => update({ continuous: v })} label={t("continuous")} />
      </div>

      {/* Display */}
      <div className="space-y-2 border-t border-card-border pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("display")}</p>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("textSize")}</span>
          <select
            className={selectCls}
            value={settings.textSize}
            onChange={(e) => update({ textSize: e.target.value as TextSize })}
          >
            {TEXT_SIZES.map((s) => (
              <option key={s} value={s}>{sizeLabel[s]}</option>
            ))}
          </select>
        </label>

        <Toggle checked={settings.showArabic} onChange={(v) => update({ showArabic: v })} label={t("showArabic")} />
        <Toggle checked={settings.showTranslation} onChange={(v) => update({ showTranslation: v })} label={t("showTranslation")} />
        <Toggle checked={settings.mushafFlow} onChange={(v) => update({ mushafFlow: v })} label={t("mushafFlow")} />
      </div>
    </div>
  );
}
