"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell } from "lucide-react";

import {
  getNotificationPrefs,
  updateNotificationPref,
  type NotificationPrefs,
  type NotificationType,
} from "@/app/[locale]/account/actions";

type Row = { key: NotificationType; title: string; desc: string };

/**
 * Per-user notification toggles (open.md §4).
 *
 * Loads the prefs for the user's active mosque, renders one switch per event
 * type, and writes each change through the server action. The model is
 * opt-out — a toggle that has never been touched is "on", which is exactly
 * what the fanout triggers assume (absent row = enabled).
 */
export function NotificationPreferences() {
  const t = useTranslations("Account");
  const [data, setData] = useState<NotificationPrefs | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getNotificationPrefs().then((d) => {
      if (cancelled) return;
      if (d) setData(d);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <section className="rounded-xl border border-card-border bg-card p-6">
        <p className="text-sm text-muted">{t("notificationsUnavailable")}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-card-border bg-card p-6 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted" />
          {t("notifications")}
        </h2>
        <div className="h-8 w-full rounded-md bg-card-border animate-pulse" />
        <div className="h-8 w-full rounded-md bg-card-border animate-pulse" />
      </section>
    );
  }

  const rows: Row[] = [
    { key: "message", title: t("prefMessage"), desc: t("prefMessageDesc") },
    { key: "announcement", title: t("prefAnnouncement"), desc: t("prefAnnouncementDesc") },
    { key: "homework", title: t("prefHomework"), desc: t("prefHomeworkDesc") },
    { key: "attendance_absent", title: t("prefAttendanceAbsent"), desc: t("prefAttendanceAbsentDesc") },
    { key: "lesson_cancelled", title: t("prefLessonCancelled"), desc: t("prefLessonCancelledDesc") },
  ];

  const toggle = (key: NotificationType, enabled: boolean) => {
    const mosqueId = data.mosqueId;
    setData((prev) =>
      prev ? { ...prev, prefs: { ...prev.prefs, [key]: enabled } } : prev,
    );
    startTransition(async () => {
      const res = await updateNotificationPref(mosqueId, key, enabled);
      if (res && "error" in res) {
        toast.error(res.error);
        // Roll the toggle back on failure.
        setData((prev) =>
          prev ? { ...prev, prefs: { ...prev.prefs, [key]: !enabled } } : prev,
        );
      }
    });
  }

  return (
    <section className="rounded-xl border border-card-border bg-card p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted" />
          {t("notifications")}
        </h2>
        <p className="text-sm text-muted mt-1">{t("notificationsDesc")}</p>
      </div>

      <ul className="divide-y divide-card-border">
        {rows.map((row) => {
          const enabled = data.prefs[row.key];
          return (
            <li key={row.key} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.title}</p>
                <p className="text-xs text-muted mt-0.5">{row.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={isPending}
                onClick={() => toggle(row.key, !enabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  enabled ? "bg-accent" : "bg-surface"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-[20px]" : "translate-x-0"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
