import { getTranslations } from "next-intl/server";

import { requireTeacher } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import {
  CalendarPage,
  type CalendarSearchParams,
} from "@/components/calendar/CalendarPage";

export default async function TeacherCalendarPage({
  searchParams,
}: {
  searchParams: CalendarSearchParams;
}) {
  const ctx = await requireTeacher();
  // The calendar is a per-mosque feature switch. Hiding the nav link is not
  // enough — the URL is guessable, and every other plugin route guards itself.
  await requirePlugin(ctx.mosqueId, "calendar", "/teacher");
  const t = await getTranslations("Teacher");

  return (
    <CalendarPage
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      role="teacher"
      searchParams={searchParams}
      breadcrumbRoot={{ href: "/teacher", label: t("overview") }}
    />
  );
}
