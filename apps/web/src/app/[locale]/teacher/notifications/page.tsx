import { requireTeacher } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { NotificationsView } from "@/components/NotificationsView";

export default async function TeacherNotificationsPage() {
  const ctx = await requireTeacher();
  await requirePlugin(ctx.mosqueId, "notifications", "/teacher");

  return <NotificationsView role="teacher" namespace="Teacher" userId={ctx.userId} />;
}
