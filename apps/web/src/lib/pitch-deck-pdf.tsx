/* eslint-disable jsx-a11y/alt-text */
// `jsx-a11y/alt-text` flags @react-pdf's `Image` as if it were an HTML `<img>`,
// but the PDF renderer has no `alt` attribute — there is nothing to attach it
// to. The screenshots are decorative proof of the real product, and the deck's
// copy carries their meaning.

import fs from "node:fs";
import path from "node:path";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Path,
  Circle,
  StyleSheet,
} from "@react-pdf/renderer";

import { registerPdfFonts } from "@/lib/pdf-fonts";

/**
 * The Mekteb pitch deck — a ~10 page brochure for mosque communities and
 * Islamic schools, rendered to PDF via @react-pdf/renderer.
 *
 * German by design (the app is German-first), on-brand: the deep-green accent
 * (#15803d), warm cream paper, Noto Serif display headings over Noto Sans
 * body, and the same mosque mark as the web header, drawn as vectors.
 *
 * Real full-page screenshots from `assets/screenshots/` are embedded so the
 * reader sees the actual product, not mockups.
 */

const INK = "#1b2a22";
const GREEN = "#15803d";
const GREEN_DARK = "#166534";
const MUTED = "#5f6f66";
const PAPER = "#f6f2e9";
const WHITE = "#ffffff";
const LINE = "#e5dfd2";
const TINT = "#e8f2ea";
const CREAM_DEEP = "#efe7d6";

/** Resolve a screenshot under the repo-root `assets/screenshots/` tree. */
function readShot(name: string): string {
  const candidates = [
    path.join(process.cwd(), "..", "..", "assets", "screenshots", name),
    path.join(process.cwd(), "assets", "screenshots", name),
  ];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) throw new Error(`Pitch deck: screenshot not found: ${name}`);
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

/** The Mekteb mark from the web header, redrawn as PDF vectors. */
function Mark({ size, color = GREEN }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 21.5V13.8A11 11 0 0 1 12 3.55A11 11 0 0 1 19 13.8V21.5Z M7.6 21.5V13.8A8.4 8.4 0 0 1 12 6.41A8.4 8.4 0 0 1 16.4 13.8V21.5Z" fill={color} fillRule="evenodd" />
      <Circle cx={12} cy={1.55} r={1.15} fill={color} />
    </Svg>
  );
}

/** A small rounded pill, e.g. the platform badges on the cover. */
function Pill({ children, filled = false }: { children: React.ReactNode; filled?: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
        backgroundColor: filled ? GREEN : WHITE,
        borderWidth: 1,
        borderColor: filled ? GREEN : LINE,
      }}
    >
      <Text style={{ fontSize: 9, fontWeight: "bold", color: filled ? WHITE : GREEN_DARK }}>
        {children}
      </Text>
    </View>
  );
}

/** Small uppercase green label above a section title. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 9, fontWeight: "bold", color: GREEN, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function Bullet({ children, dot = GREEN }: { children: React.ReactNode; dot?: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 9 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot, marginTop: 6, marginRight: 9 }} />
      <Text style={{ flex: 1, fontSize: 11.5, color: INK, lineHeight: 1.55 }}>{children}</Text>
    </View>
  );
}

function Footer({ page, total = 10 }: { page: number; total?: number }) {
  return (
    <View
      style={{
        position: "absolute",
        left: 44,
        right: 44,
        bottom: 26,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: LINE,
        paddingTop: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Mark size={12} />
        <Text style={{ fontSize: 8, color: MUTED, marginLeft: 6, letterSpacing: 1, textTransform: "uppercase" }}>
          Mekteb · Moschee-Bildung, vereinfacht
        </Text>
      </View>
      <Text style={{ fontSize: 8, color: MUTED }}>
        {page} / {total}
      </Text>
    </View>
  );
}

/** Content-page shell: paper background, generous margins, footer. */
function Slide({ children, page }: { children: React.ReactNode; page: number }) {
  return (
    <Page size={{ width: 842, height: 595 }} style={styles.page}>
      <View style={{ flex: 1, padding: 44, paddingBottom: 60 }}>{children}</View>
      <Footer page={page} />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: PAPER, fontFamily: "Noto Sans" },
  h1: { fontFamily: "Noto Serif", fontWeight: "bold", fontSize: 34, color: INK, letterSpacing: -0.5, lineHeight: 1.15 },
  h2: { fontFamily: "Noto Serif", fontWeight: "bold", fontSize: 22, color: INK, lineHeight: 1.2 },
  lead: { fontSize: 13.5, color: MUTED, lineHeight: 1.6 },
  card: { backgroundColor: WHITE, borderRadius: 14, borderWidth: 1, borderColor: LINE },
  soft: { backgroundColor: TINT, borderRadius: 14 },
});

/* ────────────────────────────────────────────────────────────────────────
 * Page 1 — Cover
 * ──────────────────────────────────────────────────────────────────────── */

function CoverPage() {
  return (
    <Page size={{ width: 842, height: 595 }} style={styles.page}>
      <View style={{ flex: 1, flexDirection: "row", padding: 44 }}>
        {/* Left — wordmark */}
        <View style={{ flex: 1, justifyContent: "center", paddingRight: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 26 }}>
            <Mark size={44} />
            <Text style={{ fontFamily: "Noto Serif", fontWeight: "bold", fontSize: 34, color: INK, marginLeft: 14 }}>
              Mekteb
            </Text>
          </View>

          <Text style={{ fontFamily: "Noto Serif", fontWeight: "bold", fontSize: 30, color: GREEN_DARK, lineHeight: 1.2, marginBottom: 14 }}>
            Moschee-Bildung,
            {"\n"}vereinfacht.
          </Text>

          <Text style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 400, marginBottom: 26 }}>
            Eine Plattform für Schülerverwaltung, Anwesenheit, Hausaufgaben,
            Prüfungen, Koran & Hifz und Kommunikation — im Browser und als
            native iOS-App.
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pill filled>Web-App</Pill>
            <Pill>iOS-App</Pill>
            <Pill>4 Sprachen</Pill>
          </View>
        </View>

        {/* Right — a green panel framing real screenshots */}
        <View style={{ width: 320, height: 505, backgroundColor: CREAM_DEEP, borderRadius: 24, padding: 16 }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: GREEN, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            So sieht es aus
          </Text>
          <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: LINE, backgroundColor: WHITE }}>
            <Image src={readShot("admin/01-uebersicht.png")} style={{ width: "100%", height: 250, objectFit: "cover" }} />
          </View>
          <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: LINE, backgroundColor: WHITE, marginTop: 12 }}>
            <Image src={readShot("student/07-koran.png")} style={{ width: "100%", height: 190, objectFit: "cover" }} />
          </View>
        </View>
      </View>
      <Footer page={1} />
    </Page>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 2 — Das Problem
 * ──────────────────────────────────────────────────────────────────────── */

function ProblemPage() {
  return (
    <Slide page={2}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ flex: 1, paddingRight: 34 }}>
          <Eyebrow>Die Herausforderung</Eyebrow>
          <Text style={styles.h1}>Die Verwaltung wächst,{"\n"}die Zeit bleibt.</Text>
          <View style={{ marginTop: 24 }}>
            <Bullet>Anwesenheit in Papierlisten — wer fehlt, geht zwischen den Notizzetteln unter.</Bullet>
            <Bullet>Hausaufgaben wandern durch WhatsApp-Gruppen — nichts ist nachvollziehbar, nichts dokumentiert.</Bullet>
            <Bullet>Eltern bleiben außen vor — Fortschritt und Fehlzeiten ihrer Kinder sind unsichtbar.</Bullet>
            <Bullet>Ehrenamtliche Lehrkräfte verwalten statt zu unterrichten.</Bullet>
            <Bullet>Einzelne Listen, Tabellen und Apps — kein gemeinsamer, aktueller Stand.</Bullet>
          </View>
        </View>

        {/* The "before" — scattered tools the deck replaces */}
        <View style={{ width: 290 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: MUTED, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
            Heute oft so
          </Text>
          {["Papierlisten", "WhatsApp-Gruppen", "Excel-Tabellen", "Notizzettel", "Einzel-Apps"].map((t, i) => (
            <View
              key={t}
              style={{
                backgroundColor: i === 0 ? WHITE : undefined,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: LINE,
                paddingHorizontal: 14,
                paddingVertical: 11,
                marginBottom: 8,
                marginLeft: i % 2 === 1 ? 22 : 0,
              }}
            >
              <Text style={{ fontSize: 11.5, color: INK, fontWeight: "bold" }}>{t}</Text>
            </View>
          ))}
          <View style={{ ...styles.soft, marginTop: 8, padding: 12 }}>
            <Text style={{ fontSize: 11, color: GREEN_DARK, lineHeight: 1.5, fontWeight: "bold" }}>
              Eine Moschee, fünf Systeme. Keine davon ist der Stand der Dinge.
            </Text>
          </View>
        </View>
      </View>
    </Slide>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 3 — Die Lösung
 * ──────────────────────────────────────────────────────────────────────── */

function SolutionPage() {
  const points: [string, string][] = [
    [
      "Ein gemeinsamer Stand",
      "Schüler, Gruppen, Anwesenheit, Hausaufgaben und Nachrichten — alle sehen dasselbe, aktuell und nachvollziehbar.",
    ],
    [
      "Web und iOS, immer synchron",
      "Am Schreibtisch im Browser, unterwegs in der App. Jede Änderung ist sofort überall sichtbar.",
    ],
    [
      "Eltern und Lehrer verbunden",
      "Fortschritt, Fehlzeiten und Hausaufgaben in Echtzeit — ohne Telefonnummern, alles in der Plattform.",
    ],
  ];
  return (
    <Slide page={3}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ flex: 1, paddingRight: 34 }}>
          <Eyebrow>Unsere Lösung</Eyebrow>
          <Text style={styles.h1}>Alles an einem Ort.</Text>
          <Text style={{ ...styles.lead, marginTop: 14, marginBottom: 24 }}>
            Mekteb bündelt die Verwaltung einer Moscheeschule in einer
            Plattform — für jede Rolle, auf jedem Gerät.
          </Text>
          {points.map(([t, d]) => (
            <View key={t} style={{ flexDirection: "row", marginBottom: 14 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: TINT, alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: GREEN }}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "bold", color: INK, marginBottom: 2 }}>{t}</Text>
                <Text style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{d}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ width: 300 }}>
          <View style={styles.card}>
            <Image src={readShot("admin/01-uebersicht.png")} style={{ width: "100%", height: 360, objectFit: "cover", borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: INK }}>Dashboard für die Moscheeverwaltung</Text>
              <Text style={{ fontSize: 9.5, color: MUTED, marginTop: 2 }}>Gruppen, Schüler, Anwesenheit — auf einen Blick.</Text>
            </View>
          </View>
        </View>
      </View>
    </Slide>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 4 — Fünf Portale
 * ──────────────────────────────────────────────────────────────────────── */

const ROLES: [string, string, string][] = [
  ["Verwaltung", "Moschee-Admin", "Gruppen, Schüler, Lehrkräfte und Eltern verwalten; Kalender, Berichte, Einstellungen und Branding."],
  ["Unterricht", "Lehrkräfte", "Anwesenheit erfassen, Hausaufgaben verteilen, Notizen & Wochenberichte schreiben, Nachrichten senden."],
  ["Eltern", "Elternportal", "Anwesenheit, Hausaufgaben und Fortschritt der Kinder einsehen — ohne eigenes Konto fürs Kind."],
  ["Schüler", "Schülerportal", "Eigene Gruppen, Hausaufgaben, Anwesenheit, Prüfungen und Koran — ein Zugang fürs Kind."],
  ["Prüfungen", "Prüfer", "Mündliche und schriftliche Prüfungen durchführen, bewerten und Diplome erstellen."],
];

function RolesPage() {
  return (
    <Slide page={4}>
      <Eyebrow>Rollen & Portale</Eyebrow>
      <Text style={styles.h1}>Fünf Portale, eine Plattform.</Text>
      <Text style={{ ...styles.lead, marginTop: 10, marginBottom: 22 }}>
        Jede Rolle sieht genau das, was sie braucht — und nichts, was sie nicht
        sehen darf.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {ROLES.map(([tag, title, desc]) => (
          <View key={title} style={{ ...styles.card, width: "48%", padding: 16, minHeight: 108 }}>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: GREEN, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>
              {tag}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: INK, marginBottom: 5 }}>{title}</Text>
            <Text style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.5 }}>{desc}</Text>
          </View>
        ))}
      </View>
    </Slide>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 5 — Module
 * ──────────────────────────────────────────────────────────────────────── */

const MODULES: [string, string][] = [
  ["Anwesenheitsverfolgung", "Anwesenheit je Sitzung erfassen — wer anwesend, verspätet, entschuldigt oder abwesend war."],
  ["Hausaufgaben & Aufgaben", "Für Gruppen oder einzelne Schüler, mit Fälligkeitsdaten und Bestätigung durch die Eltern."],
  ["Lektionsbibliothek", "Strukturierte Bibliothek aus Lektionen und Themen für den ganzen Lehrplan."],
  ["Prüfungen & Diplome", "Mündliche und schriftliche Prüfungen, Noten und Diplome — ein Ablauf, ein Ort."],
  ["Koran & Hifz", "Koran-Lehrplan mit Rezitations-Audio und sichtbarem Hifz-Fortschritt."],
  ["Direktnachrichten", "Private 1:1-Chats zwischen Lehrern, Eltern und Verwaltung — ohne Telefonnummern."],
  ["Kalender & Stundenplan", "Unterricht, Veranstaltungen und Gebetszeiten — mit Wochenplan je Gruppe."],
  ["Ankündigungen", "Für die ganze Moschee oder einzelne Gruppen, als Push-Benachrichtigung."],
];

function ModulesPage() {
  return (
    <Slide page={5}>
      <Eyebrow>Module</Eyebrow>
      <Text style={styles.h1}>Ein Baukasten für jede Moschee.</Text>
      <Text style={{ ...styles.lead, marginTop: 10, marginBottom: 22 }}>
        Jedes Modul lässt sich pro Moschee einzeln zuschalten — die Plattform
        wächst mit der Gemeinde, nicht umgekehrt.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {MODULES.map(([title, desc]) => (
          <View key={title} style={{ ...styles.card, width: "23%", padding: 13, minHeight: 122 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: TINT, marginBottom: 8 }} />
            <Text style={{ fontSize: 11.5, fontWeight: "bold", color: INK, marginBottom: 4 }}>{title}</Text>
            <Text style={{ fontSize: 9.5, color: MUTED, lineHeight: 1.5 }}>{desc}</Text>
          </View>
        ))}
      </View>
    </Slide>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 6 — Koran & Hifz
 * ──────────────────────────────────────────────────────────────────────── */

function QuranPage() {
  return (
    <Slide page={6}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ flex: 1, paddingRight: 34 }}>
          <Eyebrow>Für den Unterricht</Eyebrow>
          <Text style={styles.h1}>Koran, Hifz & Rezitation.</Text>
          <View style={{ marginTop: 22 }}>
            <Bullet>
              <Text style={{ fontWeight: "bold", color: INK }}>Koran-Leser in der App:{" "}</Text>
              Arabischer Text mit Übersetzung, Lesezeichen je Vers und Notizen.
            </Bullet>
            <Bullet>
              <Text style={{ fontWeight: "bold", color: INK }}>Rezitations-Audio:{" "}</Text>
              Mehrere Qāri’s, Verse einzeln oder die ganze Sure — auch zum Weiterhören im Schlaf-Timer.
            </Bullet>
            <Bullet>
              <Text style={{ fontWeight: "bold", color: INK }}>Hifz-Fortschritt:{" "}</Text>
              Seiten und Juz sichtbar für Lehrkräfte, Eltern und das Kind selbst.
            </Bullet>
            <Bullet>
              <Text style={{ fontWeight: "bold", color: INK }}>Lektions-Audio:{" "}</Text>
              Vertonte Lektionstexte — Schüler hören statt lesen, in jeder unterrichteten Sprache.
            </Bullet>
          </View>
        </View>
        <View style={{ width: 300 }}>
          <View style={styles.card}>
            <Image src={readShot("student/07-koran.png")} style={{ width: "100%", height: 390, objectFit: "cover", borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: INK }}>Der Koran-Leser</Text>
              <Text style={{ fontSize: 9.5, color: MUTED, marginTop: 2 }}>Verse, Audio und Lesezeichen — direkt im Unterricht einsetzbar.</Text>
            </View>
          </View>
        </View>
      </View>
    </Slide>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 7 — Web & iOS-App
 * ──────────────────────────────────────────────────────────────────────── */

function PlatformsPage() {
  return (
    <Slide page={7}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ flex: 1, paddingRight: 34 }}>
          <Eyebrow>Plattformen</Eyebrow>
          <Text style={styles.h1}>Am Schreibtisch. Unterwegs.{"\n"}Immer aktuell.</Text>
          <View style={{ marginTop: 22 }}>
            <Bullet>
              <Text style={{ fontWeight: "bold", color: INK }}>Web-App:{" "}</Text>
              für die Verwaltung am Computer — in allen modernen Browsern, als PWA installierbar.
            </Bullet>
            <Bullet>
              <Text style={{ fontWeight: "bold", color: INK }}>Native iOS-App:{" "}</Text>
              für Lehrkräfte und Eltern unterwegs, mit Push-Benachrichtigungen zu Anwesenheit, Hausaufgaben und Nachrichten.
            </Bullet>
            <Bullet>
              <Text style={{ fontWeight: "bold", color: INK }}>Widgets auf dem Home-Bildschirm:{" "}</Text>
              nächste Stunde und heutige Hausaufgaben ohne App zu öffnen.
            </Bullet>
            <Bullet>
              <Text style={{ fontWeight: "bold", color: INK }}>Ein Datenbestand:{" "}</Text>
              keine Doppelpflege zwischen Web und App — beides liest dieselben Daten.
            </Bullet>
          </View>
        </View>
        <View style={{ width: 300 }}>
          <View style={styles.card}>
            <Image src={readShot("student/02-hausaufgaben.png")} style={{ width: "100%", height: 190, objectFit: "cover", borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
          </View>
          <View style={{ ...styles.card, marginTop: 12 }}>
            <Image src={readShot("parent/02-meine-kinder.png")} style={{ width: "100%", height: 190, objectFit: "cover", borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
          </View>
        </View>
      </View>
    </Slide>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 8 — Sicherheit & Datenschutz
 * ──────────────────────────────────────────────────────────────────────── */

function SecurityPage() {
  const tiles: [string, string][] = [
    ["EU-Hosting, DSGVO", "Daten in der EU gehostet — die Grundlage für den Umgang mit Minderjährigen-Daten."],
    ["Keine Werbung, kein Tracking", "Keine Drittanbieter-Werbung und keine Analyse-SDKs in der App für Kinder."],
    ["Rollen & sichere Anmeldung", "Zugriff nur auf das eigene Portal, 2-Faktor-Anmeldung und Passwort-Rotation."],
    ["Datenschutz & Löschung", "Konten werden von der Verwaltung angelegt; Löschanträge in der App, GDPR-konform."],
  ];
  return (
    <Slide page={8}>
      <Eyebrow>Vertrauen</Eyebrow>
      <Text style={styles.h1}>Kinderschutz und DSGVO als Grundlage.</Text>
      <Text style={{ ...styles.lead, marginTop: 10, marginBottom: 24 }}>
        In einer Moscheeschule sind die meisten Nutzerinnen und Nutzer Kinder.
        Das ist bei uns eine Bauentscheidung, kein Marketing.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        {tiles.map(([t, d]) => (
          <View key={t} style={{ ...styles.card, width: "48.6%", padding: 16, minHeight: 96 }}>
            <Text style={{ fontSize: 13.5, fontWeight: "bold", color: GREEN_DARK, marginBottom: 4 }}>{t}</Text>
            <Text style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.5 }}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={{ ...styles.soft, padding: 14 }}>
        <Bullet dot={GREEN_DARK}>Jede Anfrage wird serverseitig geprüft: Nutzer sehen nur Daten ihrer eigenen Rolle und Moschee.</Bullet>
        <Bullet dot={GREEN_DARK}>Sensible Aktionen (Anmeldung, Passwort, Löschung) werden protokolliert und sind für die Verwaltung einsehbar.</Bullet>
        <Bullet dot={GREEN_DARK}>Keine öffentlichen Anmeldungen: Konten werden von der Verwaltung eingerichtet — keine Kinderdaten im offenen Internet.</Bullet>
      </View>
    </Slide>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 9 — Einführung in 3 Schritten
 * ──────────────────────────────────────────────────────────────────────── */

function OnboardingPage() {
  const steps: [string, string][] = [
    ["Moschee einrichten", "Profil und Branding anlegen — Name, Logo, Farben. In wenigen Minuten."],
    ["Team einladen", "Lehrkräfte und Eltern mit einem Klick onboarden; temporäre Passwörter werden automatisch erzeugt."],
    ["Loslegen", "Anwesenheit erfassen, Hausaufgaben verteilen, Nachrichten senden — Eltern sehen alles in Echtzeit."],
  ];
  return (
    <Slide page={9}>
      <Eyebrow>Einführung</Eyebrow>
      <Text style={styles.h1}>In drei Schritten eingerichtet.</Text>
      <Text style={{ ...styles.lead, marginTop: 10, marginBottom: 26 }}>
        Keine Schulungswochen, kein Datenmigrationsprojekt: Die Gemeinde bleibt
        die Eigentümerin ihrer Daten und startet mit dem, was sie heute schon
        tut.
      </Text>
      <View style={{ flexDirection: "row", gap: 14 }}>
        {steps.map(([t, d], i) => (
          <View key={t} style={{ ...styles.card, flex: 1, padding: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: WHITE }}>{i + 1}</Text>
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "bold", color: INK }}>{t}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.55 }}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={{ ...styles.soft, marginTop: 22, padding: 14 }}>
        <Text style={{ fontSize: 11, color: GREEN_DARK, lineHeight: 1.55 }}>
          <Text style={{ fontWeight: "bold" }}>Demo-Modus: </Text>
          Die gesamte Plattform lässt sich mit Beispieldaten ausprobieren —
          ohne Anmeldung und ohne Datenbank. Ideal für einen ersten Blick im
          Gemeindeausschuss.
        </Text>
      </View>
    </Slide>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page 10 — Abschluss
 * ──────────────────────────────────────────────────────────────────────── */

function ClosingPage() {
  return (
    <Page size={{ width: 842, height: 595 }} style={styles.page}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 44 }}>
        <Mark size={64} />
        <Text style={{ fontFamily: "Noto Serif", fontWeight: "bold", fontSize: 40, color: INK, marginTop: 18, marginBottom: 10 }}>
          Bereit?
        </Text>
        <Text style={{ fontSize: 14, color: MUTED, textAlign: "center", maxWidth: 460, lineHeight: 1.6, marginBottom: 28 }}>
          Lassen Sie uns über Ihre Gemeinde sprechen. Wir zeigen Ihnen die
          Plattform mit Ihren Daten — und begleiten die Einführung Schritt für
          Schritt.
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pill filled>Demo vereinbaren</Pill>
          <Pill>Preise je nach Gemeindegröße</Pill>
          <Pill>Einführung inbegriffen</Pill>
        </View>
        <Text style={{ fontSize: 10, color: MUTED, marginTop: 34 }}>
          Mekteb · Web-App und native iOS-App · Deutsch, Englisch, Bosnisch, Türkisch
        </Text>
      </View>
      <Footer page={10} />
    </Page>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

export function buildPitchDeckDoc() {
  registerPdfFonts();
  return (
    <Document
      title="Mekteb — Moschee-Bildung, vereinfacht"
      author="Mekteb"
      subject="Pitch für Moscheegemeinden und islamische Schulen"
      language="de"
    >
      <CoverPage />
      <ProblemPage />
      <SolutionPage />
      <RolesPage />
      <ModulesPage />
      <QuranPage />
      <PlatformsPage />
      <SecurityPage />
      <OnboardingPage />
      <ClosingPage />
    </Document>
  );
}
