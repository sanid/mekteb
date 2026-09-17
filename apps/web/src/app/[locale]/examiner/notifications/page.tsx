import { requireExaminer } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { NotificationsView } from "@/components/NotificationsView";

export default async function ExaminerNotificationsPage() {
  const ctx = await requireExaminer();
  await requirePlugin(ctx.mosqueId, "notifications", "/examiner");

  return <NotificationsView role="examiner" namespace="Examiner" userId={ctx.userId} />;
}
