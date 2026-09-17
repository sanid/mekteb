import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import { registerPdfFonts } from "@/lib/pdf-fonts";
import type { StudentReportCard } from "@/lib/report-card";
import { formatDate } from "@/lib/format";

type Locale = "de" | "en" | "bs" | "tr";

const L: Record<Locale, Record<string, string>> = {
  en: { title: "Report Card", period: "Reporting period since", attendance: "Attendance", present: "present of", rate: "Attendance rate", hifz: "Hifz Memorisation", pages: "pages", juz: "Juz", exams: "Exams", passed: "passed", failed: "failed", lessons: "Lessons completed", groups: "Groups", generated: "Generated", noData: "No data recorded for this period yet." },
  de: { title: "Zeugnis", period: "Berichtszeitraum seit", attendance: "Anwesenheit", present: "anwesend von", rate: "Anwesenheitsquote", hifz: "Hifz (Auswendiglernen)", pages: "Seiten", juz: "Juz", exams: "Prüfungen", passed: "bestanden", failed: "nicht bestanden", lessons: "Abgeschlossene Lektionen", groups: "Gruppen", generated: "Erstellt", noData: "Für diesen Zeitraum wurden noch keine Daten erfasst." },
  bs: { title: "Svjedodžba", period: "Period izvještavanja od", attendance: "Prisustvo", present: "prisutan od", rate: "Stopa prisustva", hifz: "Hifz (memorisanje)", pages: "stranica", juz: "Džuz", exams: "Ispiti", passed: "položeno", failed: "palo", lessons: "Završene lekcije", groups: "Grupe", generated: "Izrađeno", noData: "Za ovaj period još nema zabilježenih podataka." },
  tr: { title: "Karne", period: "Rapor dönemi başlangıcı", attendance: "Devam", present: "katıldı /", rate: "Devam oranı", hifz: "Hıfz (ezber)", pages: "sayfa", juz: "Cüz", exams: "Sınavlar", passed: "geçti", failed: "kaldı", lessons: "Tamamlanan dersler", groups: "Gruplar", generated: "Oluşturuldu", noData: "Bu dönem için henüz veri kaydedilmedi." },
};

const PRIMARY = "#16a34a";
const PAGES_PER_JUZ = 604 / 30;

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Noto Serif", fontSize: 11, backgroundColor: "#ffffff", color: "#1a1a1a" },
  header: { marginBottom: 18, borderBottomWidth: 2, borderBottomColor: PRIMARY, paddingBottom: 12 },
  mosque: { fontSize: 16, fontWeight: "bold", color: PRIMARY },
  title: { fontSize: 13, fontWeight: "bold", marginTop: 2 },
  meta: { fontSize: 9, color: "#666", marginTop: 4 },
  studentName: { fontSize: 20, fontWeight: "bold", marginTop: 16, marginBottom: 2 },
  groups: { fontSize: 10, color: "#555", marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: PRIMARY, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  label: { fontSize: 10, color: "#444" },
  value: { fontSize: 11, fontWeight: "bold" },
  statGrid: { flexDirection: "row", gap: 10, marginBottom: 4 },
  statCard: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 6, padding: 10, flexGrow: 1 },
  statLabel: { fontSize: 8, color: "#666", marginBottom: 3 },
  statValue: { fontSize: 16, fontWeight: "bold", color: PRIMARY },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e5e5e5", paddingTop: 8 },
  footerText: { fontSize: 8, color: "#999" },
});

function ReportCardDoc({
  data,
  mosqueName,
  locale,
  fmtDate,
}: {
  data: StudentReportCard;
  mosqueName: string;
  locale: Locale;
  fmtDate: (d: string) => string;
}) {
  const t = L[locale] ?? L.en;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.mosque}>{mosqueName}</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.meta}>{t.period} {fmtDate(data.since)}</Text>
        </View>

        <Text style={styles.studentName}>{data.fullName}</Text>
        {data.groups.length > 0 && (
          <Text style={styles.groups}>{t.groups}: {data.groups.join(", ")}</Text>
        )}

        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.rate}</Text>
            <Text style={styles.statValue}>{data.attendanceRate == null ? "—" : `${data.attendanceRate}%`}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.lessons}</Text>
            <Text style={styles.statValue}>{data.lessonsCompleted}/{data.totalLessons}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.exams}</Text>
            <Text style={styles.statValue}>{data.examsPassed} / {data.examsFailed}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t.attendance}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t.attendance}</Text>
          <Text style={styles.value}>{data.attendancePresent} {t.present} {data.attendanceTotal}</Text>
        </View>

        {data.hifz.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t.hifz}</Text>
            {data.hifz.map((h, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.label}>{h.groupName}</Text>
                <Text style={styles.value}>
                  {h.pages} {t.pages} · {Math.floor(h.pages / PAGES_PER_JUZ)} {t.juz}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>{t.exams}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t.passed} / {t.failed}</Text>
          <Text style={styles.value}>{data.examsPassed} / {data.examsFailed}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{mosqueName} · {t.generated} {fmtDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportCard(
  data: StudentReportCard,
  mosqueName: string,
  locale: string,
): Promise<Buffer> {
  registerPdfFonts();
  const lang = (["de", "en", "bs", "tr"].includes(locale) ? locale : "de") as Locale;
  const fmtDate = (d: string) =>
    formatDate(d, lang);
  return renderToBuffer(
    <ReportCardDoc data={data} mosqueName={mosqueName} locale={lang} fmtDate={fmtDate} />,
  );
}
