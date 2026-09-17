import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { registerPdfFonts, sanitizePdfText } from "@/lib/pdf-fonts";
import { formatDate } from "@/lib/format";

export type AttendanceRow = {
  full_name: string;
  status: string;
};

export type AttendancePdfInput = {
  mosqueName: string;
  groupName: string;
  sessionDate: string;
  rows: AttendanceRow[];
  /** Active request locale — drives the printed-on date format. */
  locale: string;
  i18n: {
    title: string;       // "Attendance Sheet"
    group: string;       // "Group"
    date: string;        // "Date"
    fullName: string;    // "Full name"
    attendance: string;  // "Attendance"
    signature: string;   // "Signature"
    printedOn: string;   // "Printed on"
    empty: string;       // "No attendance"
    statuses: Record<string, string>; // status value -> translated label, e.g. { present: "anwesend", ... }
  };
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Noto Serif", fontSize: 10, color: "#1a1a1a" },
  header: { borderBottomWidth: 2, borderBottomColor: "#1a1a1a", borderBottomStyle: "solid", paddingBottom: 10, marginBottom: 12 },
  mosqueName: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#666" },
  title: { fontSize: 18, fontFamily: "Noto Serif", fontWeight: "bold", marginTop: 4 },
  metaRow: { flexDirection: "row", marginTop: 6, gap: 18 },
  meta: { fontSize: 10 },
  metaLabel: { fontFamily: "Noto Serif", fontWeight: "bold" },

  table: { marginTop: 6 },
  tHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    borderBottomStyle: "solid",
    paddingVertical: 6,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
    paddingVertical: 6,
  },
  thNum: { width: 28 },
  thName: { flex: 1 },
  thStatus: { width: 80 },
  thSig: { width: 140 },
  bold: { fontFamily: "Noto Serif", fontWeight: "bold" },
  muted: { color: "#666" },

  emptyRow: { paddingVertical: 18, fontSize: 10, color: "#666" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    borderTopStyle: "solid",
    fontSize: 8,
    color: "#888",
  },
});

function statusLabel(status: string, statuses: Record<string, string>): string {
  const label = statuses[status] ?? status;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function renderAttendancePdf(input: AttendancePdfInput): Promise<Uint8Array> {
  registerPdfFonts();
  const { mosqueName: rawMosqueName, groupName: rawGroupName, sessionDate, rows, i18n, locale } = input;
  const mosqueName = sanitizePdfText(rawMosqueName);
  const groupName = sanitizePdfText(rawGroupName);
  const doc = (
    <Document title={`${i18n.title} — ${groupName} — ${sessionDate}`}>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.mosqueName}>{mosqueName}</Text>
          <Text style={styles.title}>{i18n.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              <Text style={styles.metaLabel}>{i18n.group}: </Text>{groupName}
            </Text>
            <Text style={styles.meta}>
              <Text style={styles.metaLabel}>{i18n.date}: </Text>{sessionDate}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.thNum, styles.bold]}>#</Text>
            <Text style={[styles.thName, styles.bold]}>{i18n.fullName}</Text>
            <Text style={[styles.thStatus, styles.bold]}>{i18n.attendance}</Text>
            <Text style={[styles.thSig, styles.bold]}>{i18n.signature}</Text>
          </View>
          {rows.length === 0 ? (
            <Text style={styles.emptyRow}>{i18n.empty}</Text>
          ) : (
            rows.map((r, i) => (
              <View key={i} style={styles.tRow}>
                <Text style={[styles.thNum, styles.muted]}>{i + 1}</Text>
                <Text style={[styles.thName, styles.bold]}>{r.full_name}</Text>
                <Text style={styles.thStatus}>{statusLabel(r.status, i18n.statuses)}</Text>
                <Text style={styles.thSig}> </Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          {i18n.printedOn}: {formatDate(new Date(), locale)}
        </Text>
      </Page>
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return new Uint8Array(buf);
}

export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
