import { getTranslations } from "next-intl/server";

import { requireExaminer } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import {
  CalendarPage,
  type CalendarSearchParams,
} from "@/components/calendar/CalendarPage";

export default async function ExaminerCalendarPage({
  searchParams,
}: {
  searchParams: CalendarSearchParams;
}) {
  const ctx = await requireExaminer();
  // The calendar is a per-mosque feature switch. Hiding the nav link is not
  // enough — the URL is guessable, and every other plugin route guards itself.
  await requirePlugin(ctx.mosqueId, "calendar", "/examiner");
  const t = await getTranslations("Examiner");

  return (
    <CalendarPage
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      role="examiner"
      searchParams={searchParams}
      breadcrumbRoot={{ href: "/examiner", label: t("overview") }}
    />
  );
}
