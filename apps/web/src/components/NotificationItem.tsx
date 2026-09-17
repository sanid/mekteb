import { ExternalLink } from "lucide-react";

import { Link } from "@/i18n/routing";
import { formatDateTime } from "@/lib/format";
import { notificationText } from "@/lib/notification-text";

export type NotificationRow = {
  id: string;
  subject: string | null;
  body: string;
  status: "pending" | "sent" | "failed";
  channel: string;
  created_at: string;
  is_read?: boolean;
  source_announcement_id?: string | null;
  source_message_id?: string | null;
  messages?: { thread_id: string } | null;
  template_key?: string | null;
  template_params?: Record<string, unknown> | null;
};

export function NotificationItem({
  n,
  messagesHref,
  announcementsHref,
  noSubjectLabel,
  locale,
  t,
}: {
  n: NotificationRow;
  messagesHref?: string;
  announcementsHref?: string;
  noSubjectLabel: string;
  locale: string;
  /** Scoped to the `Notifications` namespace, so the templates resolve. */
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  // The stored words are English; these are the reader's.
  const text = notificationText(n, t, locale, noSubjectLabel);

  const threadId = n.messages?.thread_id;
  const deepLink =
    threadId && messagesHref
      ? `${messagesHref}/${threadId}`
      : n.source_announcement_id && announcementsHref
      ? announcementsHref
      : null;

  return (
    <li className={`p-4 space-y-1 ${!n.is_read ? "bg-accent-subtle/30" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {!n.is_read && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-accent" />
          )}
          <span className="font-medium text-sm truncate">{text.subject}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted">{n.channel}</span>
          <span
            className={`text-xs rounded-full px-2 py-0.5 ${
              n.status === "sent"
                ? "bg-success-subtle text-success-fg"
                : n.status === "failed"
                ? "bg-danger-subtle text-danger-fg"
                : "bg-warning-subtle text-warning-fg"
            }`}
          >
            {n.status}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{text.body}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted">{formatDateTime(n.created_at, locale)}</span>
        {deepLink && (
          <Link
            href={deepLink}
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  );
}
