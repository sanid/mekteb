import { getLocale, getTranslations } from "next-intl/server";
import { QrCode, CalendarDays } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MosqueIcon } from "@/components/icons";

import { resolveCheckinSession, eligibleStudents } from "./actions";
import { CheckinClient } from "./CheckinClient";

import { formatDateShort } from "@/lib/format";
function Shell({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 grid place-items-center p-6 sm:p-8">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-card-border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center gap-2 text-center">
          <MosqueIcon className="h-9 w-9 text-accent" />
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="h-5 w-5 text-accent" /> {heading}
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("Checkin");

  const admin = createAdminClient();
  const session = await resolveCheckinSession(admin, token);

  if (!session) {
    return (
      <Shell heading={t("title")}>
        <p className="rounded-lg bg-warning-subtle px-4 py-3 text-sm text-center text-warning-fg">
          {t("closed")}
        </p>
      </Shell>
    );
  }

  // Student QR Check-In plugin gate — a disabled feature must not silently
  // accept scans. Students are not mosque members, so this is checked with
  // the service-role client (a member-scoped query would return nothing).
  const { data: pluginRow } = await admin
    .from("mosque_plugins")
    .select("plugin_id")
    .eq("mosque_id", session.mosque_id)
    .eq("plugin_id", "student_checkin")
    .eq("is_active", true)
    .maybeSingle();
  if (!pluginRow) {
    return (
      <Shell heading={t("title")}>
        <p className="rounded-lg bg-warning-subtle px-4 py-3 text-sm text-center text-warning-fg">
          {t("closed")}
        </p>
      </Shell>
    );
  }

  const students = await eligibleStudents(admin, user.userId, session);

  if (students.length === 0) {
    return (
      <Shell heading={t("title")}>
        <p className="rounded-lg bg-surface px-4 py-3 text-sm text-center text-muted">
          {t("notEligible")}
        </p>
      </Shell>
    );
  }

  // Current presence so already-marked students render as done.
  const { data: records } = await admin
    .from("attendance_records")
    .select("student_profile_id, status")
    .eq("session_id", session.id)
    .in("student_profile_id", students.map((s) => s.id));

  const presentSet = new Set(
    (records ?? []).filter((r) => r.status === "present" || r.status === "late").map((r) => r.student_profile_id),
  );

  const { data: group } = await admin
    .from("groups")
    .select("name")
    .eq("id", session.group_id)
    .maybeSingle();

  return (
    <Shell heading={t("title")}>
      <div className="flex items-center justify-center gap-2 text-sm text-muted">
        <CalendarDays className="h-4 w-4" />
        <span>{group?.name}</span>
        <span>·</span>
        <span className="tabular-nums">{formatDateShort(session.session_date, locale)}</span>
      </div>
      <p className="text-sm text-center text-muted">{t("subtitle")}</p>
      <CheckinClient
        token={token}
        students={students.map((s) => ({ id: s.id, name: s.full_name, present: presentSet.has(s.id) }))}
        labels={{
          present: t("present"),
          mark: t("mark"),
          marked: t("marked"),
        }}
      />
    </Shell>
  );
}
