import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { getMessagingData } from "@/lib/messaging-data";
import { ThreadListPanel } from "@/components/messaging/ThreadListPanel";

export type MessagingRolePrefix = "admin" | "teacher" | "parent" | "examiner";

/**
 * Desktop chrome for the messaging section: the thread sidebar plus a slot
 * for the active conversation. Shared by all four messaging portals, which
 * previously kept four byte-identical copies apart from the role prefix.
 */
export async function MessagesLayout({
  role,
  userId,
  mosqueId,
  children,
}: {
  role: MessagingRolePrefix;
  userId: string;
  mosqueId: string;
  children: ReactNode;
}) {
  const t = await getTranslations("Messaging");
  const { threads, recipients } = await getMessagingData(userId, mosqueId);

  return (
    // -m-6 cancels the p-6 on the portal <main>; h-[calc(100%+3rem)] fills it edge-to-edge
    <div className="flex -m-6 h-[calc(100%+3rem)]">
      <ThreadListPanel
        threads={threads}
        currentUserId={userId}
        recipients={recipients}
        rolePrefix={role}
        title={t("messages")}
        noMessagesLabel={t("noMessages")}
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
