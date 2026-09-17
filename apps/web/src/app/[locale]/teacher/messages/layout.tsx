import { requireTeacher } from "@/lib/auth";
import { MessagesLayout } from "@/components/messaging/MessagesLayout";

export default async function TeacherMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTeacher();

  return (
    <MessagesLayout role="teacher" userId={ctx.userId} mosqueId={ctx.mosqueId}>
      {children}
    </MessagesLayout>
  );
}
