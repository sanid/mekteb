import { requireStudent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { NotificationsView } from "@/components/NotificationsView";

export default async function StudentNotificationsPage() {
  const ctx = await requireStudent();
  await requirePlugin(ctx.mosqueId, "notifications", "/student");

  return <NotificationsView role="student" namespace="Student" userId={ctx.userId} />;
}
