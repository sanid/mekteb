import { requireExaminer } from "@/lib/auth";
import { MessagesLayout } from "@/components/messaging/MessagesLayout";

export default async function ExaminerMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireExaminer();

  return (
    <MessagesLayout role="examiner" userId={ctx.userId} mosqueId={ctx.mosqueId}>
      {children}
    </MessagesLayout>
  );
}
