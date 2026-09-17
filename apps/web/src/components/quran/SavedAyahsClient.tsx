"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, BookmarkX, Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { Link } from "@/i18n/routing";
import { useSavedAyahs } from "@/hooks/use-saved-ayahs";

import { buttonVariants } from "@/components/ui/button";
export function SavedAyahsClient({ basePath }: { basePath: string }) {
  const t = useTranslations("Quran");
  const { saved, hydrated, removeAyah, updateNote } = useSavedAyahs();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors">
        <ChevronLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <h1 className="text-lg font-semibold">{t("savedAyahs")}</h1>

      {saved.length === 0 ? (
        <p className="text-sm text-muted">{t("noSaved")}</p>
      ) : (
        <div className="space-y-3">
          {saved.map((ayah) => {
            const key = `${ayah.surahNumber}:${ayah.ayahNumber}`;
            return (
              <div key={key} className="rounded-xl border border-card-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`${basePath}/${ayah.surahNumber}#ayah-${ayah.ayahNumber}`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    {ayah.surahName} · {t("ayah")} {ayah.ayahNumber}
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(key);
                        setDraft(ayah.note ?? "");
                      }}
                      className="rounded-lg p-1.5 text-muted hover:bg-accent-subtle hover:text-accent transition-colors"
                      title={t("addNote")}
                    >
                      <StickyNote className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAyah(ayah.surahNumber, ayah.ayahNumber)}
                      className="rounded-lg p-1.5 text-muted hover:bg-danger-subtle hover:text-danger-fg transition-colors"
                      title={t("removeSaved")}
                    >
                      <BookmarkX className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-right text-lg leading-relaxed font-arabic" dir="rtl" lang="ar">
                  {ayah.arabicText}
                </p>
                {ayah.translationText && (
                  <p className="text-sm text-muted leading-relaxed border-t border-card-border pt-2">{ayah.translationText}</p>
                )}

                {editing === key ? (
                  <div className="space-y-2 border-t border-card-border pt-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      placeholder={t("notePlaceholder")}
                      className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await updateNote(ayah.surahNumber, ayah.ayahNumber, draft);
                          setEditing(null);
                          toast.success(t("noteSaved"));
                        }}
                        className={buttonVariants({ size: "sm" })}
                      >
                        {t("saveNote")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold hover:border-accent/40"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  ayah.note && (
                    <div className="flex items-start gap-2 rounded-lg bg-accent-subtle/40 px-3 py-2 text-xs text-foreground/80 border-t border-card-border">
                      <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
                      <span className="whitespace-pre-wrap">{ayah.note}</span>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
