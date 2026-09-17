import { getLocale, getTranslations } from "next-intl/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import { requireAdmin } from "@/lib/auth";
import { getMosqueConfig } from "@/lib/mosque-config";
import { fetchReportData, type ReportData, type GroupReport, type StudentReport } from "@/lib/report-data";
import { registerPdfFonts } from "@/lib/pdf-fonts";
import { dateFormatLocale } from "@/lib/format";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ locale: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const ctx = await requireAdmin();
  const locale = await getLocale();
  const t = await getTranslations("Admin");
  registerPdfFonts();

  const { schoolYearStart: since } = await getMosqueConfig(ctx.mosqueId);
  const data = await fetchReportData(ctx.mosqueId, since);

  const dateLocale = dateFormatLocale(locale);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" });

  const primaryColor = "#16a34a";

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: "Noto Serif", fontSize: 10, backgroundColor: "#ffffff" },
    header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: primaryColor, paddingBottom: 12 },
    mosqueName: { fontSize: 18, fontWeight: "bold", color: primaryColor, marginBottom: 2 },
    reportTitle: { fontSize: 14, fontWeight: "bold", color: "#1a1a1a", marginBottom: 4 },
    reportMeta: { fontSize: 9, color: "#666" },
    sectionTitle: { fontSize: 13, fontWeight: "bold", color: primaryColor, marginTop: 20, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingBottom: 4 },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    statCard: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 6, padding: 10, width: "31%" },
    statLabel: { fontSize: 8, color: "#666", marginBottom: 2 },
    statValue: { fontSize: 18, fontWeight: "bold", color: primaryColor },
    statSub: { fontSize: 7, color: "#999", marginTop: 2 },
    table: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 4, overflow: "hidden" },
    tableHeader: { flexDirection: "row", backgroundColor: "#f5f5f5", borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
    tableHeaderCell: { padding: 6, fontSize: 8, fontWeight: "bold", color: "#555" },
    tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    tableCell: { padding: 5, fontSize: 9, color: "#333" },
    tableCellBold: { padding: 5, fontSize: 9, color: "#333", fontWeight: "bold" },
    rankBadge: { padding: 3, borderRadius: 3, backgroundColor: primaryColor, color: "#fff", fontSize: 8, fontWeight: "bold", marginRight: 4 },
    highlight: { color: primaryColor, fontWeight: "bold" },
    footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e5e5e5", paddingTop: 8 },
    footerText: { fontSize: 8, color: "#999" },
  });

  const col3 = "33.3%";
  const col4 = "25%";
  const col20 = "20%";

  const OverviewSection = ({ d }: { d: ReportData }) => (
    <View>
      <Text style={styles.sectionTitle}>{t("reportOverview")}</Text>
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("reportTotalStudents")}</Text>
          <Text style={styles.statValue}>{d.totalStudents}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("reportTotalGroups")}</Text>
          <Text style={styles.statValue}>{d.totalGroups}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("reportTotalTeachers")}</Text>
          <Text style={styles.statValue}>{d.totalTeachers}</Text>
        </View>
      </View>
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("attendanceRateYear")}</Text>
          <Text style={styles.statValue}>{d.overallAttendanceRate ?? "—"}%</Text>
          <Text style={styles.statSub}>{d.overallAttPresent} / {d.overallAttTotal}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("reportStudentsOverHalf")}</Text>
          <Text style={styles.statValue}>{d.studentsAttendedOverHalf}</Text>
          <Text style={styles.statSub}>{t("reportOutOf", { total: d.totalStudents })}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("examPassRateYear")}</Text>
          <Text style={styles.statValue}>{d.overallExamPassRate ?? "—"}%</Text>
          <Text style={styles.statSub}>{d.examPassed} {t("examPassed")} / {d.examPassed + d.examFailed} {t("examTotal")}</Text>
        </View>
      </View>
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("lessonCompletionYear")}</Text>
          <Text style={styles.statValue}>{d.overallLessonRate ?? "—"}%</Text>
        </View>
      </View>
    </View>
  );

  const GroupTable = ({ groups }: { groups: GroupReport[] }) => (
    <View>
      <Text style={styles.sectionTitle}>{t("reportGroupProgress")}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: col20 }]}>{t("groups")}</Text>
          <Text style={[styles.tableHeaderCell, { width: col20 }]}>{t("students")}</Text>
          <Text style={[styles.tableHeaderCell, { width: col20 }]}>{t("attendance")}</Text>
          <Text style={[styles.tableHeaderCell, { width: col20 }]}>{t("lessonProgress")}</Text>
          <Text style={[styles.tableHeaderCell, { width: col20 }]}>{t("examsLabel")}</Text>
        </View>
        {groups.map((g, i) => (
          <View key={g.id} style={[styles.tableRow, i === 0 ? { backgroundColor: "#f0fdf4" } : {}]}>
            <Text style={[styles.tableCellBold, { width: col20 }]}>{i === 0 ? "★ " : ""}{g.name}</Text>
            <Text style={[styles.tableCell, { width: col20 }]}>{g.studentCount}</Text>
            <Text style={[styles.tableCell, { width: col20 }]}>{g.attendanceRate ?? "—"}%</Text>
            <Text style={[styles.tableCell, { width: col20 }]}>{g.lessonRate ?? "—"}%</Text>
            <Text style={[styles.tableCell, { width: col20 }]}>{g.examPassRate ?? "—"}% ({g.examPassed}✓ {g.examFailed}✗)</Text>
          </View>
        ))}
      </View>
      {groups.length > 0 && (
        <Text style={{ fontSize: 8, color: "#666", marginTop: 4 }}>★ {t("reportBestGroup")}</Text>
      )}
    </View>
  );

  const TopStudentsTable = ({ students }: { students: StudentReport[] }) => (
    <View>
      <Text style={styles.sectionTitle}>{t("reportTopStudents")}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: "8%" }]}>#</Text>
          <Text style={[styles.tableHeaderCell, { width: col4 }]}>{t("students")}</Text>
          <Text style={[styles.tableHeaderCell, { width: col4 }]}>{t("attendance")}</Text>
          <Text style={[styles.tableHeaderCell, { width: col4 }]}>{t("lessonProgress")}</Text>
          <Text style={[styles.tableHeaderCell, { width: col4 }]}>{t("examsLabel")}</Text>
        </View>
        {students.map((s, i) => (
          <View key={s.id} style={[styles.tableRow, i < 3 ? { backgroundColor: "#f0fdf4" } : {}]}>
            <Text style={[styles.tableCell, { width: "8%" }]}>{i + 1}</Text>
            <Text style={[styles.tableCellBold, { width: col4 }]}>{s.fullName}</Text>
            <Text style={[styles.tableCell, { width: col4 }]}>{s.attendanceRate ?? "—"}% ({s.attendancePresent}/{s.attendanceTotal})</Text>
            <Text style={[styles.tableCell, { width: col4 }]}>{s.lessonCompletionRate ?? "—"}% ({s.lessonsCompleted}/{s.totalLessons})</Text>
            <Text style={[styles.tableCell, { width: col4 }]}>{s.examsPassed}✓ {s.examsFailed}✗</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const doc = (
    <Document title={`${t("annualReport")} — ${data.mosqueName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.mosqueName}>{data.mosqueName}</Text>
          <Text style={styles.reportTitle}>{t("annualReport")}</Text>
          <Text style={styles.reportMeta}>{t("reportPeriod")}: {fmtDate(data.schoolYearStart)} — {fmtDate(data.generatedAt)}</Text>
        </View>

        <OverviewSection d={data} />

        {data.groups.length > 0 && <GroupTable groups={data.groups} />}

        <View style={{ height: 12 }} />

        {data.topStudents.length > 0 && <TopStudentsTable students={data.topStudents} />}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("reportGenerated")}: {fmtDate(data.generatedAt)}</Text>
          <Text style={styles.footerText}>Mekteb</Text>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const safeName = data.mosqueName.replace(/[^\w-]+/g, "_");

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${safeName}-${data.schoolYearStart}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
