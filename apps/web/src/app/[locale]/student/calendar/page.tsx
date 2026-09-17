import { getTranslations } from "next-intl/server";

import { requireStudent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import {
  CalendarPage,
  type CalendarSearchParams,
} from "@/components/calendar/CalendarPage";

export default async function StudentCalendarPage({
  searchParams,
}: {
  searchParams: CalendarSearchParams;
}) {
  const ctx = await requireStudent();
  // The calendar is a per-mosque feature switch. Hiding the nav link is not
  // enough — the URL is guessable, and every other plugin route guards itself.
  await requirePlugin(ctx.mosqueId, "calendar", "/student");
  const t = await getTranslations("Student");

  return (
    <CalendarPage
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      role="student"
      searchParams={searchParams}
      breadcrumbRoot={{ href: "/student", label: t("overview") }}
    />
  );
}
