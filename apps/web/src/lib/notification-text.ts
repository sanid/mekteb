import { formatDate } from "@/lib/format";

/**
 * Renders a notification in the reader's language.
 *
 * The fanout triggers store English sentences in `subject`/`body` — the
 * database cannot know which of four locales each recipient reads. Since
 * `20260805000300_notification_templates` they also record what happened
 * (`template_key`) and the values involved (`template_params`); this turns
 * that back into a sentence.
 *
 * Mirrors `apps/mobile/src/lib/notification-text.ts`. The two must agree,
 * which is why both read the same `Notifications` message keys.
 *
 * Anything without a key — rows written before the migration, and
 * announcements, whose text is the announcement itself — falls back to the
 * stored words rather than to a blank card.
 */
export type TemplatedNotification = {
  subject: string | null;
  body: string;
  created_at: string;
  template_key?: string | null;
  template_params?: Record<string, unknown> | null;
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

function str(params: Record<string, unknown>, key: string): string | null {
  const value = params[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function notificationText(
  n: TemplatedNotification,
  t: Translate,
  locale: string,
  noSubjectLabel: string,
): { subject: string; body: string } {
  const params = (n.template_params ?? {}) as Record<string, unknown>;
  const day = (value: string) =>
    formatDate(value, locale, { day: "numeric", month: "long" });

  switch (n.template_key) {
    case "message.new": {
      const sender = str(params, "sender") ?? t("tplSomeone");
      return {
        subject: str(params, "threadSubject") ?? t("tplNewMessageSubject"),
        body: t("tplNewMessageBody", { sender }),
      };
    }

    case "homework.new": {
      const title = str(params, "title") ?? "";
      const group = str(params, "group") ?? t("tplYourClass");
      const dueDate = str(params, "dueDate");
      return {
        subject: t("tplNewHomeworkSubject", { title }),
        body: dueDate
          ? t("tplNewHomeworkDue", { title, group, dueDate: day(dueDate) })
          : t("tplNewHomeworkBody", { title, group }),
      };
    }

    case "attendance.absent": {
      const student = str(params, "student") ?? t("tplYourChild");
      const group = str(params, "group") ?? t("tplYourClass");
      const date = str(params, "date");
      return {
        subject: t("tplAbsentSubject", { student }),
        body: t("tplAbsentBody", {
          student,
          group,
          date: day(date ?? n.created_at),
        }),
      };
    }

    case "lesson.cancelled": {
      const group = str(params, "group") ?? t("tplLessonCancelledNoGroup");
      const date = str(params, "date");
      const startTime = str(params, "startTime");
      const reason = str(params, "notes");
      return {
        subject: t("tplLessonCancelledSubject", { group }),
        body:
          t("tplLessonCancelledBody", {
            group,
            date: date ? day(date) : day(n.created_at),
            time: startTime ?? "",
          }) + (reason ? t("tplLessonCancelledReason", { reason }) : ""),
      };
    }

    case "written_test.new": {
      const title = str(params, "title") ?? "";
      return {
        subject: t("tplWrittenTestSubject", { title }),
        body: t("tplWrittenTestBody"),
      };
    }

    default:
      return { subject: n.subject ?? noSubjectLabel, body: n.body };
  }
}
