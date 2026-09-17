# App Store Connect — Metadata (Deutsch / German)

Primary locale: **de-DE**. These values go into App Store Connect under
*App Information* (name/subtitle/keywords) and *App Store* → *App Store
Version* (description/what's new). English equivalents in `metadata-en.md`.

---

## App Information

| Field | Value |
|-------|-------|
| **App name** | Mekteb |
| **Subtitle** | Moschee-Unterricht & Verwaltung |
| **Primary language** | German (de-DE) |
| **Bundle ID** | `de.mekteb.app` |
| **SKU** | `mekteb` |
| **Category** | Education |
| **Age rating** | 4+ (see note below) |
| **Privacy policy URL** | `https://mekteb.de/de/privacy` |
| **Support URL** | `https://mekteb.de/de/impressum` |
| **Marketing URL** | `https://mekteb.de` |
| **Copyright** | © 2026 Mekteb |

> **Age rating note.** The app carries messaging between parents, teachers and
> the mosque — Apple's questionnaire may push you to 9+ or higher because of
> user-to-user communication. Decide the rating during review, not at the last
> minute. Content itself (Islamic education, Quran) is unobjectionable.

## Keywords

```
Moschee, Unterricht, Koran, Islam, Schule, Hausaufgaben, Noten, Anwesenheit, Prüfung, Religion
```

(Single comma-separated string, ≤100 chars, German. Apple picks the language
of your primary locale; German keywords are fine — English is secondary.)

---

## App Store version 1.0

### What's New (for the first release)

```
Erste Veröffentlichung von Mekteb.
```

### Description (German)

```
Mekteb bringt den Moschee-Unterricht aufs Handy – für Lehrkräfte, Eltern,
Schülerinnen und Schüler sowie die Moschee-Verwaltung.

Für Lehrkräfte
- Gruppen verwalten und Teilnahme einfach erfassen
- Hausaufgaben an die ganze Gruppe oder einzelne Schüler verteilen
- Wochennotizen und Fortschritt dokumentieren
- Prüfungen planen, durchführen und benoten
- Nachrichten an Eltern und Moschee senden

Für Eltern
- Anwesenheit, Hausaufgaben und Fortschritt der eigenen Kinder verfolgen
- Unterrichtsplan und Kalender einsehen
- Nachrichten und Ankündigungen der Moschee empfangen

Für Schülerinnen und Schüler
- Eigene Gruppen, Hausaufgaben und Anwesenheit
- Unterrichtsmaterial und Notizen
- Koran-Leser mit Rezitation, gemerkten Versen und Hifz-Fortschritt

Für die Moschee-Verwaltung
- Schüler, Lehrkräfte und Eltern verwalten
- Anwesenheit, Prüfungen und Jahresbericht
- Ankündigungen, Nachrichten und Benachrichtigungen
- Anmeldung und Konten anlegen (keine öffentliche Registrierung)

Privatsphäre steht an erster Stelle: Alle Daten gehören der jeweiligen
Moschee, werden nicht an Dritte verkauft und sind durch Zugriffskontrollen
geschützt. Die App eignet sich für den Unterricht von Kindern – es gibt keine
Werbung und keine Verfolgung durch Drittanbieter.

Hinweis: Für die Nutzung ist ein Konto erforderlich, das die Moschee vergibt.
```

### Screenshots

See `screenshots.md`. Capture order (German locale):
1. Start / Kalender (Übersicht)
2. Gruppen-Liste (Lehrer)
3. Hausaufgaben (Schüler)
4. Anwesenheit erfassen
5. Nachrichten / Chat
6. Koran-Leser

---

## Demo mode

Every portal can be explored without login at `https://mekteb.de/de/demo` —
screenshots of the web app already exist under `assets/screenshots/`. Store
screenshots must come from the **mobile app**, but the demo gives you the same
views for layout reference.
