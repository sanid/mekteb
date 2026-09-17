import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderAttendancePdf, pdfResponse } from "@/lib/attendance-pdf";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const locale = await getLocale();
  const { sessionId } = await params;
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select(
      "id, session_date, group_id, groups(name), attendance_records(status, student_profile_id, student_profiles(full_name))",
    )
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!session) notFound();

  const group = session.groups as { name: string } | null;
  const records = (
    (session.attendance_records ?? []) as Array<{
      status: string;
      student_profile_id: string;
      student_profiles: { full_name: string } | null;
    }>
  )
    .map((r) => ({
      full_name: r.student_profiles?.full_name ?? "—",
      status: r.status,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const bytes = await renderAttendancePdf({
    mosqueName: ctx.mosqueName,
    groupName: group?.name ?? "—",
    sessionDate: session.session_date,
    rows: records,
    locale,
    i18n: {
      title: t("attendanceSheet"),
      group: t("groups"),
      date: t("sessionDate"),
      fullName: t("fullName"),
      attendance: t("attendance"),
      signature: t("signature"),
      printedOn: t("printedOn"),
      empty: t("noAttendance"),
      statuses: {
        present: t("present"),
        absent: t("absent"),
        late: t("late"),
        excused: t("excused"),
      },
    },
  });

  const filename = `attendance-${(group?.name ?? "group").replace(/[^\w-]+/g, "_")}-${session.session_date}.pdf`;
  return pdfResponse(bytes, filename);
}
