import { requireParent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { MessagesIndex } from "@/components/messaging/MessagesIndex";

export default async function ParentMessagesPage() {
  const ctx = await requireParent();
  await requirePlugin(ctx.mosqueId, "messaging", "/parent");

  return <MessagesIndex role="parent" userId={ctx.userId} mosqueId={ctx.mosqueId} />;
}
