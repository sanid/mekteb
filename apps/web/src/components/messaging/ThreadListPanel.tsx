"use client";

import { Link } from "@/i18n/routing";
import { NewChatButton, type ContactRecipient } from "./NewChatButton";
import { useLocale, useTranslations } from "next-intl";
import { formatDateShort } from "@/lib/format";
import { useLiveMessages } from "./use-live-messages";

export type ThreadPreview = {
  id: string;
  updated_at: string;
  participants: Array<{
    profile_id: string | null;
    last_read_at: string | null;
    name: string;
    deleted: boolean;
  }>;
  lastMessage: { body: string; author_profile_id: string | null } | null;
};

type Props = {
  threads: ThreadPreview[];
  currentUserId: string;
  recipients: ContactRecipient[];
  rolePrefix: "admin" | "teacher" | "parent" | "examiner";
  title: string;
  noMessagesLabel: string;
};

type MessagingTranslator = ReturnType<typeof useTranslations<"Messaging">>;

function relativeTime(iso: string, t: MessagingTranslator, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (mins < 2) return t("now");
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return t("yesterday");
  if (days < 7) return `${days}d`;
  return formatDateShort(iso, locale);
}

export function ThreadListPanel({
  threads,
  currentUserId,
  recipients,
  rolePrefix,
  title,
  noMessagesLabel,
}: Props) {
  const t = useTranslations("Messaging");
  const locale = useLocale();
  // No thread id: RLS on `messages` already limits delivery to conversations
  // this user is in, so any insert they can see is one their list should
  // reorder for.
  useLiveMessages();
  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-card-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border shrink-0">
        <h2 className="font-semibold text-sm">{title}</h2>
        <NewChatButton recipients={recipients} rolePrefix={rolePrefix} />
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted text-center">{noMessagesLabel}</div>
        ) : (
          threads.map((thread) => {
            const others = thread.participants.filter(
              (p) => p.profile_id !== currentUserId,
            );
            const me = thread.participants.find(
              (p) => p.profile_id === currentUserId,
            );
            const isUnread =
              !me?.last_read_at ||
              new Date(thread.updated_at) > new Date(me.last_read_at);
            const hasDeleted = others.some((p) => p.deleted);
            const otherNames =
              others.map((p) => p.name).join(", ") || "?";
            const preview = thread.lastMessage?.body ?? "";

            return (
              <Link
                key={thread.id}
                href={`/${rolePrefix}/messages/${thread.id}`}
                prefetch={true}
                className="flex items-start gap-3 px-4 py-3 border-b border-card-border/50 hover:bg-accent-subtle transition-colors group"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-semibold mt-0.5">
                  {(otherNames[0] ?? "—").toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <span
                      className={`text-sm truncate flex items-center gap-1.5 ${isUnread ? "font-semibold" : "font-medium text-foreground/80"}`}
                    >
                      <span className="truncate">{otherNames}</span>
                      {hasDeleted && (
                        <span className="shrink-0 rounded-full bg-surface text-muted px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                          {t("deletedUser")}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-muted shrink-0 tabular-nums">
                      {relativeTime(thread.updated_at, t, locale)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isUnread ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    ) : null}
                    <span className="text-xs text-muted truncate leading-relaxed">
                      {preview}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
