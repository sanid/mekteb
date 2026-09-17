import { Document, Page, Text, View, StyleSheet, Svg, Path, G, Circle, Rect, Polygon, Image } from "@react-pdf/renderer";

import { registerPdfFonts, sanitizePdfText } from "@/lib/pdf-fonts";
import type { Database } from "@/lib/supabase/types";
import type { DiplomaElement } from "@/lib/diploma-types";

export type DiplomaVariant = "clean" | "fancy" | "islamic";

export type DiplomaInput = {
  mosqueName: string;
  primaryColor: string;
  studentName: string;
  groupName: string;
  teacherName: string | null;
  examinerName: string | null;
  formattedDate: string;
  i18n: {
    title: string;
    subtitle: string;
    certify: string;
    body: string;
    examiner: string;
    teacher: string;
    date: string;
  };
  variant: DiplomaVariant;
};

export function buildDiplomaDoc(input: DiplomaInput) {
  registerPdfFonts();
  switch (input.variant) {
    case "clean":   return cleanDiploma(input);
    case "islamic": return islamicDiploma(input);
    case "fancy":
    default:        return fancyDiploma(input);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Fancy — double-border ornate (current style)
// ────────────────────────────────────────────────────────────────────────────

function fancyDiploma(i: DiplomaInput) {
  const c = i.primaryColor;
  const s = StyleSheet.create({
    page: { padding: 0, fontFamily: "Noto Serif", backgroundColor: "#fff" },
    outer: { flex: 1, margin: 20, borderWidth: 6, borderColor: c, padding: 36 },
    inner: { flex: 1, borderWidth: 1, borderColor: c, padding: 36, alignItems: "center", justifyContent: "center" },
    mosqueName: { fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: c, marginBottom: 20 },
    title: { fontSize: 32, fontWeight: "bold", color: c, letterSpacing: 1.5, textAlign: "center", marginBottom: 6 },
    subtitle: { fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 36 },
    certify: { fontSize: 13, color: "#444", marginBottom: 14 },
    studentRow: { borderBottomWidth: 1.5, borderBottomColor: c, paddingBottom: 4, marginBottom: 18 },
    studentName: { fontSize: 28, fontWeight: "bold", color: "#1a1a1a" },
    body: { fontSize: 13, color: "#444", textAlign: "center", marginBottom: 6 },
    bodyStrong: { fontSize: 14, fontWeight: "bold", color: c, textAlign: "center", marginTop: 4, marginBottom: 8 },
    teacherLine: { fontSize: 11, color: "#555", textAlign: "center", marginBottom: 36 },
    footer: { position: "absolute", bottom: 56, left: 56, right: 56, borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 16, flexDirection: "row", justifyContent: "space-between" },
    sigBlock: { alignItems: "center", width: 160 },
    sigLine: { width: 140, borderTopWidth: 1, borderTopColor: "#333", marginTop: 28, marginBottom: 6 },
    sigLabel: { fontSize: 10, color: "#666", textAlign: "center" },
    dateText: { fontSize: 11, color: "#444", marginBottom: 4, marginTop: 28 },
  });
  return (
    <Document title={`${i.i18n.title} — ${i.studentName}`}>
      <Page size="A4" style={s.page}>
        <View style={s.outer}>
          <View style={s.inner}>
            <Text style={s.mosqueName}>{i.mosqueName}</Text>
            <Text style={s.title}>{i.i18n.title}</Text>
            <Text style={s.subtitle}>{i.i18n.subtitle}</Text>
            <Text style={s.certify}>{i.i18n.certify}</Text>
            <View style={s.studentRow}><Text style={s.studentName}>{i.studentName}</Text></View>
            <Text style={s.body}>{i.i18n.body}</Text>
            <Text style={s.bodyStrong}>{i.groupName}</Text>
            {i.teacherName ? <Text style={s.teacherLine}>{i.i18n.teacher}: {i.teacherName}</Text> : null}
          </View>
          <View style={s.footer}>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{i.i18n.examiner}{i.examinerName ? `\n${i.examinerName}` : ""}</Text>
            </View>
            <View style={s.sigBlock}>
              <Text style={s.dateText}>{i.formattedDate}</Text>
              <Text style={s.sigLabel}>{i.i18n.date}</Text>
            </View>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{i.mosqueName}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Clean — minimalist; no border, generous whitespace, single hairline accent
// ────────────────────────────────────────────────────────────────────────────

function cleanDiploma(i: DiplomaInput) {
  const c = i.primaryColor;
  const s = StyleSheet.create({
    page: { padding: 72, fontFamily: "Noto Serif", backgroundColor: "#fff" },
    mosqueName: { fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#888", marginBottom: 96, textAlign: "center" },
    title: { fontSize: 38, fontWeight: "bold", color: "#111", letterSpacing: 0.5, textAlign: "center", marginBottom: 8 },
    accent: { width: 60, height: 2, backgroundColor: c, alignSelf: "center", marginBottom: 8 },
    subtitle: { fontSize: 11, color: "#888", letterSpacing: 1.5, textAlign: "center", marginBottom: 80 },
    certify: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 16 },
    studentName: { fontSize: 32, fontWeight: "bold", color: "#111", textAlign: "center", marginBottom: 28 },
    body: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 4 },
    bodyStrong: { fontSize: 16, fontWeight: "bold", color: "#111", textAlign: "center", marginTop: 4 },
    teacherLine: { fontSize: 11, color: "#888", textAlign: "center", marginTop: 12 },
    footer: { position: "absolute", bottom: 72, left: 72, right: 72, flexDirection: "row", justifyContent: "space-between" },
    sigBlock: { alignItems: "center", width: 160 },
    sigLine: { width: 140, borderTopWidth: 0.5, borderTopColor: "#888", marginTop: 28, marginBottom: 6 },
    sigLabel: { fontSize: 9, color: "#888", textAlign: "center", letterSpacing: 1 },
    dateText: { fontSize: 11, color: "#444", marginTop: 28, marginBottom: 4 },
  });
  return (
    <Document title={`${i.i18n.title} — ${i.studentName}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.mosqueName}>{i.mosqueName}</Text>
        <Text style={s.title}>{i.i18n.title}</Text>
        <View style={s.accent} />
        <Text style={s.subtitle}>{i.i18n.subtitle}</Text>
        <Text style={s.certify}>{i.i18n.certify}</Text>
        <Text style={s.studentName}>{i.studentName}</Text>
        <Text style={s.body}>{i.i18n.body}</Text>
        <Text style={s.bodyStrong}>{i.groupName}</Text>
        {i.teacherName ? <Text style={s.teacherLine}>{i.i18n.teacher}: {i.teacherName}</Text> : null}
        <View style={s.footer}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>{i.i18n.examiner}{i.examinerName ? `\n${i.examinerName}` : ""}</Text>
          </View>
          <View style={s.sigBlock}>
            <Text style={s.dateText}>{i.formattedDate}</Text>
            <Text style={s.sigLabel}>{i.i18n.date}</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>{i.mosqueName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Islamic — green + gold, eight-point star + arch motifs, calligraphic feel
// ────────────────────────────────────────────────────────────────────────────

function islamicDiploma(i: DiplomaInput) {
  // Locked traditional palette from the source SVG.
  const green = "#235036";
  const gold = "#b89947";
  const ivory = "#fcfaf5";
  const ink = "#1a1a1a";

  // Source SVG viewBox is A3 in points (841.89 × 1190.55). We render onto A4
  // and let preserveAspectRatio scale it. Content positions also live in the
  // SVG coord system so they line up with the frame.
  const VB_W = 841.89;
  const VB_H = 1190.55;

  const s = StyleSheet.create({
    page: { padding: 0, fontFamily: "Noto Serif", backgroundColor: ivory },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  });

  // Helper to convert SVG-coord y → A4 page y (in pt).
  const yPt = (y: number) => (y / VB_H) * 842;
  const xPt = (x: number) => (x / VB_W) * 595.28;

  const textBlock = (
    <View
      style={{
        position: "absolute",
        top: yPt(360),
        left: xPt(120),
        right: xPt(120),
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 12, color: gold, fontWeight: "bold", letterSpacing: 1, marginBottom: 18 }}>
        Bismillāh ar-Raḥmān ar-Raḥīm
      </Text>
      <Text style={{ fontSize: 10, color: green, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>
        {i.mosqueName}
      </Text>
      <Text style={{ fontSize: 30, fontWeight: "bold", color: green, letterSpacing: 1.2, textAlign: "center", marginBottom: 4 }}>
        {i.i18n.title}
      </Text>
      <Text style={{ fontSize: 11, color: gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 24 }}>
        {i.i18n.subtitle}
      </Text>
      <Text style={{ fontSize: 13, color: "#444", marginBottom: 14 }}>{i.i18n.certify}</Text>
      <View style={{ borderBottomWidth: 1, borderBottomColor: gold, paddingBottom: 6, marginBottom: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: ink, textAlign: "center" }}>
          {i.studentName}
        </Text>
      </View>
      <Text style={{ fontSize: 13, color: "#444", textAlign: "center", marginBottom: 4 }}>{i.i18n.body}</Text>
      <Text style={{ fontSize: 15, fontWeight: "bold", color: green, textAlign: "center", marginTop: 4 }}>
        {i.groupName}
      </Text>
      {i.teacherName ? (
        <Text style={{ fontSize: 11, color: "#666", textAlign: "center", marginTop: 8 }}>
          {i.i18n.teacher}: {i.teacherName}
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <View
      style={{
        position: "absolute",
        top: yPt(980),
        left: xPt(120),
        right: xPt(120),
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 0.5,
        borderTopColor: gold,
        paddingTop: 12,
      }}
    >
      <View style={{ alignItems: "center", width: 160 }}>
        <View style={{ width: 140, borderTopWidth: 0.5, borderTopColor: ink, marginTop: 22, marginBottom: 4 }} />
        <Text style={{ fontSize: 10, color: "#555", textAlign: "center" }}>
          {i.i18n.examiner}{i.examinerName ? `\n${i.examinerName}` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "center", width: 160 }}>
        <Text style={{ fontSize: 11, color: "#333", marginTop: 22, marginBottom: 2 }}>{i.formattedDate}</Text>
        <Text style={{ fontSize: 10, color: "#555", textAlign: "center" }}>{i.i18n.date}</Text>
      </View>
      <View style={{ alignItems: "center", width: 160 }}>
        <View style={{ width: 140, borderTopWidth: 0.5, borderTopColor: ink, marginTop: 22, marginBottom: 4 }} />
        <Text style={{ fontSize: 10, color: "#555", textAlign: "center" }}>{i.mosqueName}</Text>
      </View>
    </View>
  );

  // Frame + medallion translated from public/assets/diploma-frame.svg.
  // All coordinates are in the source SVG viewBox.
  const frame = (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
      {/* Triple outer border */}
      <Rect x={26.31} y={27} width={789.27} height={1136.55} fill="none" stroke={gold} strokeWidth={1.58} />
      <Rect x={33.68} y={34.37} width={774.54} height={1121.82} fill="none" stroke={gold} strokeWidth={4.21} />
      <Rect x={44.2} y={44.89} width={753.49} height={1100.77} fill="none" stroke={gold} strokeWidth={1.05} />

      {/* Main inner border lines (green + gold) */}
      <G>
        <Path
          d="M126.28,74.36h589.32M126.28,1116.19h589.32M73.67,126.97v936.6M768.22,126.97v936.6"
          fill="none" stroke={green} strokeWidth={3.16}
        />
        <Path
          d="M115.76,90.14h610.37M115.76,1100.41h610.37M89.45,116.45v957.65M752.44,116.45v957.65"
          fill="none" stroke={gold} strokeWidth={1.58}
        />
      </G>

      {/* Top medallion */}
      <G>
        {/* Side flourishes (left and right) */}
        <Path
          d="M252.57,158.55c42.09-63.14,84.19-63.14,105.24-21.05-21.05,10.52-52.62,0-73.67,31.57,21.05-10.52,52.62-10.52,73.67,21.05-31.57,0-73.67,21.05-105.24-31.57Z"
          fill="none" stroke={gold} strokeWidth={2.1}
        />
        <Path
          d="M178.9,158.55c31.57-31.57,63.14-31.57,84.19-10.52-21.05,10.52-42.09,0-52.62,21.05,10.52-10.52,31.57-10.52,52.62,10.52-31.57,0-63.14,10.52-84.19-21.05Z"
          fill="none" stroke={green} strokeWidth={1.58}
        />
        <Path
          d="M589.32,158.55c-42.09-63.14-84.19-63.14-105.24-21.05,21.05,10.52,52.62,0,73.67,31.57-21.05-10.52-52.62-10.52-73.67,21.05,31.57,0,73.67,21.05,105.24-31.57Z"
          fill="none" stroke={gold} strokeWidth={2.1}
        />
        <Path
          d="M662.99,158.55c-31.57-31.57-63.14-31.57-84.19-10.52,21.05,10.52,42.09,0,52.62,21.05-10.52-10.52-31.57-10.52-52.62,10.52,31.57,0,63.14,10.52,84.19-21.05Z"
          fill="none" stroke={green} strokeWidth={1.58}
        />

        {/* Nested rotated squares — eight-point star */}
        <Rect x={347.28} y={84.88} width={147.33} height={147.33} fill="none" stroke={gold} strokeWidth={3.16} />
        <Rect
          x={347.28} y={84.88} width={147.33} height={147.33}
          fill="none" stroke={gold} strokeWidth={3.16}
          transform="translate(11.18 344.09) rotate(-45)"
        />
        <Rect
          x={355.7} y={93.3} width={130.49} height={130.49}
          fill="none" stroke={green} strokeWidth={2.1}
          transform="translate(113.38 486.77) rotate(-67.5)"
        />
        <Rect
          x={355.7} y={93.3} width={130.49} height={130.49}
          fill="none" stroke={green} strokeWidth={2.1}
          transform="translate(-28.63 173.16) rotate(-22.5)"
        />

        {/* Central medallion: ivory disk + crescent + star */}
        <Circle cx={420.94} cy={158.55} r={57.88} fill={ivory} />
        <Circle cx={420.94} cy={158.55} r={52.62} fill="none" stroke={green} strokeWidth={2.1} />
        <Circle cx={420.94} cy={158.55} r={48.41} fill="none" stroke={gold} strokeWidth={1.05} />
        <Path
          d="M413.35,139.85c-6.12,6.21-6.05,16.2.16,22.32,6.21,6.12,16.2,6.05,22.32-.16,1.77-1.79,3.08-3.98,3.83-6.38.9,10.42-6.81,19.6-17.24,20.51-10.42.9-19.6-6.81-20.51-17.24-.71-8.16,3.91-15.84,11.43-19.06Z"
          fill={gold}
        />
        <Polygon
          points="430.04,135.98 432.24,140.4 437.4,140.4 433.72,144.08 435.19,149.24 430.04,146.29 425.62,149.24 427.09,144.08 423.41,140.4 428.56,140.4"
          fill={gold}
        />
      </G>
    </Svg>
  );

  return (
    <Document title={`${i.i18n.title} — ${i.studentName}`}>
      <Page size="A4" style={s.page}>
        <View style={s.overlay}>{frame}</View>
        {textBlock}
        {footer}
      </Page>
    </Document>
  );
}

export function buildCustomDiplomaDoc(template: Database["public"]["Tables"]["diploma_templates"]["Row"], i: DiplomaInput) {
  registerPdfFonts();
  const isLandscape = template.orientation === "landscape";
  
  const styles = StyleSheet.create({
    page: {
      padding: 0,
      backgroundColor: "#ffffff",
      position: "relative",
      width: "100%",
      height: "100%"
    }
  });

  const formatText = (txt: string) => {
    return sanitizePdfText(
      txt
        .replace(/{studentName}/g, i.studentName)
        .replace(/{groupName}/g, i.groupName)
        .replace(/{teacherName}/g, i.teacherName || "")
        .replace(/{examinerName}/g, i.examinerName || "")
        .replace(/{formattedDate}/g, i.formattedDate)
        .replace(/{mosqueName}/g, i.mosqueName)
    );
  };

  return (
    <Document title={`${i.i18n.title} — ${i.studentName}`}>
      <Page size="A4" orientation={isLandscape ? "landscape" : "portrait"} style={styles.page}>
        {template.background_image_url && (
          <Image
            src={template.background_image_url}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%"
            }}
          />
        )}
        
        {((template.elements as unknown as DiplomaElement[] | null) || []).map((el, index) => {
          if (el.type === "text") {
            const fontStyle = el.fontFamily === "Noto Serif" ? "Noto Serif" : "Noto Sans";
            return (
              <Text
                key={el.id || index}
                style={{
                  position: "absolute",
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: el.width ? `${el.width}%` : "auto",
                  fontSize: el.fontSize || 12,
                  fontFamily: fontStyle,
                  color: el.color || "#000000",
                  textAlign: el.align || "left"
                }}
              >
                {formatText(el.text || "")}
              </Text>
            );
          } else if (el.type === "image") {
            if (!el.url) return null;
            return (
              <Image
                key={el.id || index}
                src={el.url}
                style={{
                  position: "absolute",
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width || 10}%`,
                  height: `${el.height || 10}%`
                }}
              />
            );
          }
          return null;
        })}
      </Page>
    </Document>
  );
}
