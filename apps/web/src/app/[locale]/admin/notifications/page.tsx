import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const locale = await getLocale();
  redirect(`/${locale}/admin/announcements?tab=notifications`);
}
