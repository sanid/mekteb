import { requireParent } from "@/lib/auth";
import { MessagesLayout } from "@/components/messaging/MessagesLayout";

export default async function ParentMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireParent();

  return (
    <MessagesLayout role="parent" userId={ctx.userId} mosqueId={ctx.mosqueId}>
      {children}
    </MessagesLayout>
  );
}
