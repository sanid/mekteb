import { requireExaminer } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { MessagesIndex } from "@/components/messaging/MessagesIndex";

export default async function ExaminerMessagesPage() {
  const ctx = await requireExaminer();
  await requirePlugin(ctx.mosqueId, "messaging", "/examiner");

  return <MessagesIndex role="examiner" userId={ctx.userId} mosqueId={ctx.mosqueId} />;
}
