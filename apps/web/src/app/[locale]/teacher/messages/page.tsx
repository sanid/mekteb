import { requireTeacher } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { MessagesIndex } from "@/components/messaging/MessagesIndex";

export default async function TeacherMessagesPage() {
  const ctx = await requireTeacher();
  await requirePlugin(ctx.mosqueId, "messaging", "/teacher");

  return <MessagesIndex role="teacher" userId={ctx.userId} mosqueId={ctx.mosqueId} />;
}
