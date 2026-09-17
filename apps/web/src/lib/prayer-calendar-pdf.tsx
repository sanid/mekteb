import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

import { registerPdfFonts } from "@/lib/pdf-fonts";
import { PRAYER_ORDER, type PrayerTimes } from "@/lib/prayer-times";
import { dateFormatLocale } from "@/lib/format";

/**
 * The monthly prayer timetable, as a poster.
 *
 * Modelled on the printed *vaktija* a Bosnian mosque pins to its notice board:
 * a heavy title block with the mosque's marks, a column of standing
 * information down the left, and a dense table whose two most-consulted
 * columns — the start of the fast and the breaking of it — are tinted so a
 * reader finds them without reading the header.
 *
 * The reference is printed in tan and brown. Nothing here is: every colour is
 * derived from the mosque's own `primary_color`, with `secondary_color` used
 * for the tinted columns when one is set. A mosque that has chosen blue gets a
 * blue poster, and it still reads as the same document.
 */

export type PrayerCalendarDay = {
  date: Date;
  times: PrayerTimes;
};

export type PrayerCalendarInput = {
  mosqueName: string;
  appName?: string | null;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  location: string;
  timezone: string;
  method?: string | null;
  monthLabel: string;
  printedOn: string;
  locale: string;
  days: PrayerCalendarDay[];
  /** Standing information for the left column, all optional. */
  contact?: {
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  welcomeMessage?: string | null;
  i18n: {
    title: string;
    location: string;
    timezone: string;
    printedOn: string;
    day: string;
    weekday: string;
    hijri: string;
    contact: string;
    method: string;
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
};

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb {
  const clean = (hex || "").replace("#", "");
  const safe = clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean;
  const n = parseInt(safe.slice(0, 6) || "16a34a", 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/** Mix toward white — `amount` 0 keeps the colour, 1 is white. */
function tint(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return toHex({
    r: r + (255 - r) * amount,
    g: g + (255 - g) * amount,
    b: b + (255 - b) * amount,
  });
}

/** Mix toward black — for text that must stay legible on a tinted paper. */
function shade(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return toHex({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) });
}

/**
 * White or near-black, whichever the eye can actually read on `hex`.
 * A mosque may well pick a pale yellow, and white-on-yellow is unreadable.
 */
function readableOn(hex: string): string {
  const { r, g, b } = parseHex(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1f2937" : "#ffffff";
}

/** Short hijri date without the year (day + abbreviated month). */
function formatHijriShort(date: Date, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  try {
    return new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, opts).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat(`${locale}-u-ca-islamic`, opts).format(date);
    } catch {
      return new Intl.DateTimeFormat("en-u-ca-islamic", opts).format(date);
    }
  }
}

export function buildPrayerCalendarDoc(i: PrayerCalendarInput) {
  registerPdfFonts();

  const c = i.primaryColor || "#16a34a";
  /** The accent for the two tinted columns; falls back to the primary. */
  const accent = i.secondaryColor || c;

  const ink = shade(c, 0.55); // headings
  const paper = tint(c, 0.94); // the poster's warm ground
  const rule = tint(c, 0.62); // hairlines between rows
  const bandBg = c; // table header band
  const bandFg = readableOn(c);
  const colTint = tint(accent, 0.8); // fajr + maghrib columns
  const colTintStrong = tint(accent, 0.66); // …on a highlighted row
  const rowTint = tint(c, 0.88); // fridays
  const sidebarBg = tint(c, 0.9);

  const dateLocale = dateFormatLocale(i.locale);
  const weekdayFmt = new Intl.DateTimeFormat(dateLocale, { weekday: "short" });
  const dayFmt = new Intl.DateTimeFormat(dateLocale, { day: "2-digit" });

  const s = StyleSheet.create({
    page: {
      fontFamily: "Noto Sans",
      fontSize: 7,
      backgroundColor: paper,
      paddingTop: 14,
      paddingBottom: 14,
      paddingLeft: 14,
      paddingRight: 14,
    },
    /** The printed poster's outer keyline. */
    frame: {
      borderWidth: 1.5,
      borderColor: tint(c, 0.35),
      borderRadius: 4,
      padding: 10,
      height: "100%",
    },

    header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
    headerText: { flexGrow: 1, paddingRight: 10 },
    title: { fontSize: 21, fontWeight: "bold", color: ink, letterSpacing: -0.4 },
    subtitle: { fontSize: 9, color: shade(c, 0.2), marginTop: 3 },
    mosqueLine: { fontSize: 7.5, color: shade(c, 0.1), marginTop: 5, fontWeight: "bold" },
    marks: { alignItems: "flex-end" },
    logo: { width: 42, height: 42, objectFit: "contain" },
    markName: { fontSize: 7, fontWeight: "bold", color: ink, marginTop: 3, textAlign: "right", maxWidth: 120 },

    rule: { height: 2, backgroundColor: c, marginBottom: 8 },

    body: { flexDirection: "row", flexGrow: 1 },

    aside: {
      width: "23%",
      paddingRight: 8,
    },
    asideBlock: {
      backgroundColor: sidebarBg,
      borderRadius: 3,
      padding: 6,
      marginBottom: 6,
    },
    asideHeading: {
      fontSize: 7,
      fontWeight: "bold",
      color: ink,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    asideText: { fontSize: 6.5, color: shade(c, 0.35), lineHeight: 1.5 },
    asideRow: { marginBottom: 4 },
    asideLabel: {
      fontSize: 5.5,
      color: tint(shade(c, 0.3), 0.25),
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    asideValue: { fontSize: 7, color: shade(c, 0.45), marginTop: 0.5 },

    table: { flexGrow: 1, flexDirection: "column", borderWidth: 0.8, borderColor: tint(c, 0.45), borderRadius: 3, overflow: "hidden" },

    groupRow: { flexDirection: "row", backgroundColor: bandBg },
    groupCell: {
      paddingTop: 4,
      paddingBottom: 2,
      fontSize: 7,
      fontWeight: "bold",
      color: bandFg,
      textAlign: "center",
    },
    subRow: { flexDirection: "row", backgroundColor: bandBg },
    subCell: {
      paddingBottom: 4,
      fontSize: 5,
      color: bandFg,
      textAlign: "center",
      opacity: 0.85,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 0.5,
      borderTopColor: rule,
      // Rows share whatever height is left, so February fills the sheet as
      // completely as March does.
      flexGrow: 1,
    },
    cell: {
      paddingTop: 2.6,
      paddingBottom: 2.6,
      fontSize: 7.5,
      color: shade(c, 0.5),
      textAlign: "center",
    },
    dayNum: { fontSize: 8, fontWeight: "bold", color: ink, textAlign: "center" },
    weekdayCell: { fontSize: 7, color: shade(c, 0.3), textAlign: "center" },
    hijriCell: { fontSize: 6.5, color: tint(shade(c, 0.3), 0.25), textAlign: "center" },
    timeStrong: { fontSize: 7.5, fontWeight: "bold", color: shade(accent, 0.55), textAlign: "center" },

    footer: {
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: tint(c, 0.5),
      paddingTop: 5,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    footerText: { fontSize: 6, color: tint(shade(c, 0.3), 0.25) },
  });

  // Day block gets a fixed share; the six prayers divide the rest evenly.
  const wDay = 7;
  const wWeekday = 8;
  const wHijri = 11;
  const wPrayer = (100 - wDay - wWeekday - wHijri) / PRAYER_ORDER.length;

  /** The two columns a reader is usually looking for. */
  const emphasised = new Set(["fajr", "maghrib"]);

  const contactRows = [
    i.contact?.address ? { value: i.contact.address } : null,
    i.contact?.phone ? { value: i.contact.phone } : null,
    i.contact?.email ? { value: i.contact.email } : null,
    i.contact?.website ? { value: i.contact.website } : null,
  ].filter((r): r is { value: string } => !!r);

  return (
    <Document title={`${i.i18n.title} — ${i.monthLabel}`}>
      <Page size="A4" style={s.page}>
        <View style={s.frame}>
          {/* ── Title block ── */}
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.title}>{i.i18n.title}</Text>
              <Text style={s.subtitle}>
                {i.monthLabel} · {i.location}
              </Text>
              <Text style={s.mosqueLine}>{i.appName || i.mosqueName}</Text>
            </View>
            <View style={s.marks}>
              {i.logoUrl ? <Image src={i.logoUrl} style={s.logo} /> : null}
              {i.appName && i.appName !== i.mosqueName ? (
                <Text style={s.markName}>{i.mosqueName}</Text>
              ) : null}
            </View>
          </View>
          <View style={s.rule} />

          <View style={s.body}>
            {/* ── Standing information ── */}
            <View style={s.aside}>
              {i.welcomeMessage ? (
                <View style={s.asideBlock}>
                  <Text style={s.asideText}>{i.welcomeMessage}</Text>
                </View>
              ) : null}

              {/* No heading — the labels below say what each line is, and a
                  block headed with the document's own title says nothing. */}
              <View style={s.asideBlock}>
                <View style={s.asideRow}>
                  <Text style={s.asideLabel}>{i.i18n.location}</Text>
                  <Text style={s.asideValue}>{i.location}</Text>
                </View>
                <View style={s.asideRow}>
                  <Text style={s.asideLabel}>{i.i18n.timezone}</Text>
                  <Text style={s.asideValue}>{i.timezone}</Text>
                </View>
                {i.method ? (
                  <View style={s.asideRow}>
                    <Text style={s.asideLabel}>{i.i18n.method}</Text>
                    <Text style={s.asideValue}>{i.method}</Text>
                  </View>
                ) : null}
              </View>

              {contactRows.length > 0 ? (
                <View style={s.asideBlock}>
                  <Text style={s.asideHeading}>{i.i18n.contact}</Text>
                  {contactRows.map((row) => (
                    <Text key={row.value} style={s.asideText}>
                      {row.value}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            {/* ── The month ── */}
            <View style={s.table}>
              {/*
                Two header rows so the three date columns read as one group,
                the way the printed vaktija sets them. The prayer names sit in
                the upper row and the lower row is left blank beneath them,
                which is how a merged cell has to be faked without rowspan.
              */}
              <View style={s.groupRow}>
                <Text style={[s.groupCell, { width: `${wDay + wWeekday + wHijri}%` }]}>
                  {i.i18n.day}
                </Text>
                {PRAYER_ORDER.map((key) => (
                  <Text
                    key={key}
                    style={[
                      s.groupCell,
                      { width: `${wPrayer}%` },
                      emphasised.has(key) ? { backgroundColor: shade(accent, 0.15) } : {},
                    ]}
                  >
                    {i.i18n[key]}
                  </Text>
                ))}
              </View>
              <View style={s.subRow}>
                <Text style={[s.subCell, { width: `${wDay}%` }]}>#</Text>
                <Text style={[s.subCell, { width: `${wWeekday}%` }]}>{i.i18n.weekday}</Text>
                <Text style={[s.subCell, { width: `${wHijri}%` }]}>{i.i18n.hijri}</Text>
                {PRAYER_ORDER.map((key) => (
                  <Text
                    key={key}
                    style={[
                      s.subCell,
                      { width: `${wPrayer}%` },
                      emphasised.has(key) ? { backgroundColor: shade(accent, 0.15) } : {},
                    ]}
                  >
                    {" "}
                  </Text>
                ))}
              </View>

              {i.days.map((d) => {
                // Friday is the week's centre of gravity; the printed sheets
                // always mark it.
                const isFriday = d.date.getDay() === 5;
                return (
                  <View
                    key={d.date.toISOString()}
                    style={[s.row, isFriday ? { backgroundColor: rowTint } : {}]}
                  >
                    <Text style={[s.cell, s.dayNum, { width: `${wDay}%` }]}>
                      {dayFmt.format(d.date)}
                    </Text>
                    <Text style={[s.cell, s.weekdayCell, { width: `${wWeekday}%` }]}>
                      {weekdayFmt.format(d.date)}
                    </Text>
                    <Text style={[s.cell, s.hijriCell, { width: `${wHijri}%` }]}>
                      {formatHijriShort(d.date, i.locale)}
                    </Text>
                    {PRAYER_ORDER.map((key) => {
                      const strong = emphasised.has(key);
                      return (
                        <Text
                          key={key}
                          style={[
                            s.cell,
                            strong ? s.timeStrong : {},
                            { width: `${wPrayer}%` },
                            strong
                              ? { backgroundColor: isFriday ? colTintStrong : colTint }
                              : {},
                          ]}
                        >
                          {d.times[key]}
                        </Text>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>
              {i.i18n.printedOn}: {i.printedOn}
            </Text>
            <Text style={s.footerText}>{i.contact?.website || i.appName || i.mosqueName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
