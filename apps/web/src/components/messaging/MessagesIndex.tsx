import { getLocale, getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";

import { Link } from "@/i18n/routing";
import { getMessagingData } from "@/lib/messaging-data";
import { formatDateShort } from "@/lib/format";
import { NewChatButton } from "@/components/messaging/NewChatButton";
import type { MessagingRolePrefix } from "@/components/messaging/MessagesLayout";

/**
 * The messaging index: a full thread list on mobile, and a "pick a
 * conversation" placeholder on desktop where the sidebar already shows the
 * list. Shared by all four messaging portals.
 */
export async function MessagesIndex({
  role,
  userId,
  mosqueId,
}: {
  role: MessagingRolePrefix;
  userId: string;
  mosqueId: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Messaging");

  // Mobile only — on desktop the layout sidebar already rendered these.
  const { threads, recipients } = await getMessagingData(userId, mosqueId);

  return (
    <>
      {/* ── Mobile thread list (hidden on md+) ─────────────────────────── */}
      <div className="md:hidden flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <h1 className="font-semibold text-sm">{t("messages")}</h1>
          <NewChatButton recipients={recipients} rolePrefix={role} />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-card-border/50">
          {threads.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">{t("noMessages")}</p>
          ) : (
            threads.map((thread) => {
              const others = thread.participants.filter((p) => p.profile_id !== userId);
              const me = thread.participants.find((p) => p.profile_id === userId);
              const isUnread =
                !me?.last_read_at || new Date(thread.updated_at) > new Date(me.last_read_at);
              const otherNames = others.map((p) => p.name).join(", ") || "?";
              const hasDeleted = others.some((p) => p.deleted);

              return (
                <Link
                  key={thread.id}
                  href={`/${role}/messages/${thread.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-accent-subtle transition-colors"
                >
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
                      <span className="text-[11px] text-muted shrink-0">
                        {formatDateShort(thread.updated_at, locale)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isUnread ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      ) : null}
                      <span className="text-xs text-muted truncate">
                        {thread.lastMessage?.body ?? ""}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* ── Desktop empty state (hidden on mobile) ──────────────────────── */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 text-muted">
        <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
        <p className="text-sm font-medium">{t("selectConversation")}</p>
        <p className="text-xs mt-1 opacity-60">{t("startNewChat")}</p>
      </div>
    </>
  );
}
