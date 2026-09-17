import { requireParent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { NotificationsView } from "@/components/NotificationsView";

export default async function ParentNotificationsPage() {
  const ctx = await requireParent();
  await requirePlugin(ctx.mosqueId, "notifications", "/parent");

  return <NotificationsView role="parent" namespace="Parent" userId={ctx.userId} />;
}
