import { requireAdmin } from "@/lib/auth";
import { MessagesLayout } from "@/components/messaging/MessagesLayout";

export default async function AdminMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAdmin();

  return (
    <MessagesLayout role="admin" userId={ctx.userId} mosqueId={ctx.mosqueId}>
      {children}
    </MessagesLayout>
  );
}
