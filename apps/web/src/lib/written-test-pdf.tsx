import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { registerPdfFonts, sanitizePdfText } from "@/lib/pdf-fonts";

export type TestQuestion = { id: string; question_text: string };

export type WrittenTestInput = {
  mosqueName: string;
  title: string;
  formattedDate: string;
  questions: TestQuestion[];
};

const ANSWER_LINES = 5;
const LINE_HEIGHT = 22; // points between each answer line

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Noto Sans",
    fontSize: 11,
    backgroundColor: "#ffffff",
    color: "#111111",
  },
  header: {
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "#166534",
  },
  mosqueName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 3,
  },
  testTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 2,
  },
  meta: {
    fontSize: 9,
    color: "#555555",
  },
  nameRow: {
    flexDirection: "row",
    marginBottom: 28,
    gap: 32,
  },
  nameField: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#aaaaaa",
    paddingBottom: 3,
  },
  nameLabel: {
    fontSize: 9,
    color: "#888888",
    marginBottom: 12,
  },
  questionBlock: {
    marginBottom: 20,
  },
  questionText: {
    fontWeight: "bold",
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  answerLine: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#cccccc",
    marginBottom: LINE_HEIGHT,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#aaaaaa",
    borderTopWidth: 0.5,
    borderTopColor: "#dddddd",
    paddingTop: 6,
  },
});

function WrittenTestDocument({ mosqueName, title, formattedDate, questions }: WrittenTestInput) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.mosqueName}>{sanitizePdfText(mosqueName)}</Text>
          <Text style={styles.testTitle}>{sanitizePdfText(title)}</Text>
          <Text style={styles.meta}>{formattedDate}</Text>
        </View>

        {/* Name / Date fields */}
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Text style={styles.nameLabel}>Name:</Text>
          </View>
          <View style={styles.nameField}>
            <Text style={styles.nameLabel}>Datum:</Text>
          </View>
        </View>

        {/* Questions */}
        {questions.map((q, i) => (
          <View key={q.id} style={styles.questionBlock} wrap={false}>
            <Text style={styles.questionText}>{i + 1}. {sanitizePdfText(q.question_text)}</Text>
            {Array.from({ length: ANSWER_LINES }).map((_, li) => (
              <View key={li} style={styles.answerLine} />
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{sanitizePdfText(mosqueName)} — {sanitizePdfText(title)}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function buildWrittenTestPdf(input: WrittenTestInput): Promise<Uint8Array> {
  registerPdfFonts();
  const buffer = await renderToBuffer(<WrittenTestDocument {...input} />);
  return new Uint8Array(buffer);
}
