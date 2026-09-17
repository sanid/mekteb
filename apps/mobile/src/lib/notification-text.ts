import { formatDate, t } from "./i18n";
import type { NotificationItem } from "./types";

/**
 * Turns a notification row into text in the reader's language.
 *
 * The database writes English sentences into `subject`/`body` — it has to
 * write *something*, and it cannot know which of four locales each recipient
 * reads. Since `20260805000300_notification_templates` it also records what
 * happened (`template_key`) and the values involved (`template_params`), which
 * is what this renders.
 *
 * Rows written before that migration, and announcements (whose text is the
 * announcement itself, written by a human in the mosque's language), have no
 * key and fall back to the stored text — never to a blank card.
 */
type Params = Record<string, unknown>;

function str(params: Params, key: string): string | null {
  const value = params[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function notificationText(n: NotificationItem): {
  subject: string;
  body: string | null;
} {
  const key = n.template_key;
  const params = (n.template_params ?? {}) as Params;

  const tn = (k: string, vars?: Record<string, string | number>) =>
    t("Notifications", k, vars);

  switch (key) {
    case "message.new": {
      // A thread with a subject is named by it; the sender's name is the news
      // either way. `sender` is null when the author's profile is gone.
      const sender = str(params, "sender") ?? tn("tplSomeone");
      return {
        subject: str(params, "threadSubject") ?? tn("tplNewMessageSubject"),
        body: tn("tplNewMessageBody", { sender }),
      };
    }

    case "homework.new": {
      const title = str(params, "title") ?? "";
      const group = str(params, "group") ?? tn("tplYourClass");
      const dueDate = str(params, "dueDate");
      return {
        subject: tn("tplNewHomeworkSubject", { title }),
        body: dueDate
          ? tn("tplNewHomeworkDue", {
              title,
              group,
              // The row stores an ISO date so the locale decides how it reads.
              dueDate: formatDate(dueDate, { day: "numeric", month: "long" }),
            })
          : tn("tplNewHomeworkBody", { title, group }),
      };
    }

    case "attendance.absent": {
      const student = str(params, "student") ?? tn("tplYourChild");
      const group = str(params, "group") ?? tn("tplYourClass");
      const date = str(params, "date");
      return {
        subject: tn("tplAbsentSubject", { student }),
        body: tn("tplAbsentBody", {
          student,
          group,
          date: date
            ? formatDate(date, { day: "numeric", month: "long" })
            : formatDate(n.created_at, { day: "numeric", month: "long" }),
        }),
      };
    }

    case "lesson.cancelled": {
      const group = str(params, "group") ?? tn("tplLessonCancelledNoGroup");
      const date = str(params, "date");
      const startTime = str(params, "startTime");
      const reason = str(params, "notes");
      return {
        subject: tn("tplLessonCancelledSubject", { group }),
        body:
          tn("tplLessonCancelledBody", {
            group,
            date: date
              ? formatDate(date, { day: "numeric", month: "long" })
              : formatDate(n.created_at, { day: "numeric", month: "long" }),
            time: startTime ?? "",
          }) + (reason ? tn("tplLessonCancelledReason", { reason }) : ""),
      };
    }

    case "written_test.new": {
      const title = str(params, "title") ?? "";
      return {
        subject: tn("tplWrittenTestSubject", { title }),
        body: tn("tplWrittenTestBody"),
      };
    }

    default:
      return {
        subject: n.subject || t("Notifications", "noSubject"),
        body: n.body,
      };
  }
}
