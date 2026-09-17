import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { MessagesIndex } from "@/components/messaging/MessagesIndex";

export default async function AdminMessagesPage() {
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "messaging", "/admin");

  return <MessagesIndex role="admin" userId={ctx.userId} mosqueId={ctx.mosqueId} />;
}
