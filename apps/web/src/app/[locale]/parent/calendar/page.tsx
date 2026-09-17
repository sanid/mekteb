import { getTranslations } from "next-intl/server";

import { requireParent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import {
  CalendarPage,
  type CalendarSearchParams,
} from "@/components/calendar/CalendarPage";

export default async function ParentCalendarPage({
  searchParams,
}: {
  searchParams: CalendarSearchParams;
}) {
  const ctx = await requireParent();
  // The calendar is a per-mosque feature switch. Hiding the nav link is not
  // enough — the URL is guessable, and every other plugin route guards itself.
  await requirePlugin(ctx.mosqueId, "calendar", "/parent");
  const t = await getTranslations("Parent");

  return (
    <CalendarPage
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      role="parent"
      searchParams={searchParams}
      breadcrumbRoot={{ href: "/parent", label: t("overview") }}
    />
  );
}
