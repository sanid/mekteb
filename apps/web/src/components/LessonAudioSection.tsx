"use client";

import { useTranslations } from "next-intl";
import { Music } from "lucide-react";

import { ActionForm } from "@/components/ActionForm";
import { uploadLessonAudio, deleteLessonAudio } from "@/lib/lesson-audio-actions";

import { inputCls } from "@/components/FormField";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export type LessonAudioItem = {
  id: string;
  locale: string | null;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string;
};

const LOCALE_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  bs: "Bosanski",
  tr: "Türkçe",
};

function humanSize(bytes: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function LessonAudioSection({
  lessonId,
  audio,
}: {
  lessonId: string;
  audio: LessonAudioItem[];
}) {
  const t = useTranslations("Admin");

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Music className="h-5 w-5" />
        {t("lessonAudio")}
      </h2>

      <ActionForm
        action={uploadLessonAudio}
        successMessage={t("audioUploaded")}
        className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5"
      >
        <input type="hidden" name="lesson_id" value={lessonId} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            name="title"
            required
            placeholder={t("audioTitle")}
            className={inputCls}
          />
          <select
            name="locale"
            className={inputCls}
          >
            <option value="">{t("audioAllLanguages")}</option>
            {(["de", "en", "bs", "tr"] as const).map((code) => (
              <option key={code} value={code}>
                {LOCALE_LABELS[code]}
              </option>
            ))}
          </select>
        </div>
        <input
          type="file"
          name="file"
          accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg"
          required
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
        <button
          type="submit"
          className={cn(buttonVariants(), "self-start")}
        >
          {t("uploadAudio")}
        </button>
      </ActionForm>

      {audio.length === 0 ? (
        <p className="text-sm text-muted">{t("noLessonAudio")}</p>
      ) : (
        <ul className="divide-y divide-card-border rounded-xl border border-card-border">
          {audio.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{a.locale ? LOCALE_LABELS[a.locale] ?? a.locale : "🌍"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.title}</div>
                {humanSize(a.sizeBytes) ? (
                  <div className="text-xs text-muted">{humanSize(a.sizeBytes)}</div>
                ) : null}
              </div>
              {a.locale ? (
                <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent">
                  {a.locale}
                </span>
              ) : null}
              <ActionForm
                action={deleteLessonAudio}
                successMessage={t("audioDeleted")}
                className="inline-block"
              >
                <input type="hidden" name="lesson_id" value={lessonId} />
                <input type="hidden" name="audio_id" value={a.id} />
                <input type="hidden" name="storage_path" value={a.storagePath} />
                <button
                  type="submit"
                  className={buttonVariants({ variant: "destructive", size: "sm" })}
                >
                  {t("delete")}
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
