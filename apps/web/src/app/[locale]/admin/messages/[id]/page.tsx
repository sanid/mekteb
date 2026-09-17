import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { ChatWindow, type ChatMessage } from "@/components/messaging/ChatWindow";
import { markThreadRead, sendMessage } from "@/lib/messaging-actions";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminThreadPage({ params }: PageProps) {
  const { id: threadId } = await params;
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "messaging", "/admin");
  const t = await getTranslations("Messaging");
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("message_threads")
    .select(
      "id, subject, message_participants(profile_id, profiles(full_name, display_name))",
    )
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) notFound();

  const { data: rawMessages } = await supabase
    .from("messages")
    .select("id, body, created_at, author_profile_id, profiles(full_name, display_name)")
    .eq("thread_id", threadId)
    .order("created_at");

  await markThreadRead(threadId);

  const participants = (thread.message_participants ?? []) as Array<{
    profile_id: string | null;
    profiles: { full_name: string | null; display_name: string | null } | null;
  }>;
  const others = participants.filter((p) => p.profile_id !== ctx.userId);
  const hasDeletedOther = others.some(
    (p) => p.profile_id === null || p.profiles === null,
  );
  const otherNames =
    others
      .map((p) => {
        if (p.profile_id === null || p.profiles === null) return "User";
        return p.profiles?.display_name ?? p.profiles?.full_name ?? "—";
      })
      .join(", ") || t("noSubject");

  const messages: ChatMessage[] = (rawMessages ?? []).map((m) => {
    const prof = m.profiles as {
      full_name: string | null;
      display_name: string | null;
    } | null;
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      author_profile_id: m.author_profile_id,
      authorName: prof?.display_name ?? prof?.full_name ?? "—",
    };
  });

  const replyAction = sendMessage.bind(null, threadId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-card-border bg-background">
        <Link
          href="/admin/messages"
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-accent-subtle hover:text-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-semibold">
          {(otherNames[0] ?? "—").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate flex items-center gap-1.5">
            <span className="truncate">{otherNames}</span>
            {hasDeletedOther && (
              <span className="shrink-0 rounded-full bg-surface text-muted px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                {t("deletedUser")}
              </span>
            )}
          </div>
          {thread.subject ? (
            <div className="text-xs text-muted truncate">{thread.subject}</div>
          ) : null}
        </div>
      </div>

      {/* Chat body (scrollable messages + sticky send bar) */}
      <ChatWindow
        messages={messages}
        currentUserId={ctx.userId}
        threadId={thread.id}
        sendAction={replyAction}
      />
    </div>
  );
}
