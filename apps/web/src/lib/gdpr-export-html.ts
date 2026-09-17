import type { UserExport } from "./gdpr-export";

/**
 * Render a user data export as a single self-contained HTML document
 * with inline styles. Goal: something a non-technical user can open in
 * any browser and actually read.
 */
export function renderUserExportHtml(data: UserExport): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Mekteb — Ihr Datenexport</title>
<style>${styles()}</style>
</head>
<body>
<main>
  ${header(data)}
  ${section("Konto", accountTable(data))}
  ${section("Mitgliedschaften", listOrEmpty(data.memberships, membershipsTable))}
  ${data.teacher_profiles.length ? section("Lehrerprofil", profileBlock(data.teacher_profiles)) : ""}
  ${data.parent_profiles.length ? section("Elternprofil", profileBlock(data.parent_profiles)) : ""}
  ${data.student_profiles.length ? section("Schülerprofil", profileBlock(data.student_profiles)) : ""}
  ${data.parent_student_links.length ? section("Eltern-Kind-Verknüpfungen", linksTable(data.parent_student_links)) : ""}
  ${data.group_enrollments.length ? section("Gruppenzugehörigkeiten", enrollmentsTable(data.group_enrollments)) : ""}
  ${data.attendance_records.length ? section("Anwesenheitsdaten", attendanceTable(data.attendance_records)) : ""}
  ${data.homework_targets.length ? section("Persönlich zugewiesene Hausaufgaben", targetsTable(data.homework_targets)) : ""}
  ${data.homework_submissions.length ? section("Hausaufgaben-Abgaben", submissionsTable(data.homework_submissions)) : ""}
  ${data.progress_notes.length ? section("Fortschrittsnotizen", notesTable(data.progress_notes)) : ""}
  ${data.lesson_completions.length ? section("Abgeschlossene Lektionen", completionsTable(data.lesson_completions)) : ""}
  ${data.message_participations.length ? section("Konversationen, an denen Sie teilnehmen", participationsTable(data.message_participations)) : ""}
  ${data.messages_authored.length ? section("Von Ihnen gesendete Nachrichten", messagesTable(data.messages_authored)) : ""}
  ${data.notifications.length ? section("Benachrichtigungen", notificationsTable(data.notifications)) : ""}
  ${data.login_audit.length ? section("Anmeldeverlauf", loginTable(data.login_audit)) : ""}
  ${data.audit_logs_as_actor.length ? section("Von Ihnen durchgeführte Aktionen", auditTable(data.audit_logs_as_actor)) : ""}
  ${data.gdpr_requests.length ? section("Ihre bisherigen DSGVO-Anfragen", gdprRequestsTable(data.gdpr_requests)) : ""}
  <footer>
    <p>Dieser Export wurde gemäß Art. 15 DSGVO erstellt.</p>
    <p>Erstellt am: ${esc(new Date(data.generated_at).toLocaleString("de-DE"))}</p>
    <p>Nutzer-ID: <code>${esc(data.user_id)}</code></p>
  </footer>
</main>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────

function styles(): string {
  return `
    *,*::before,*::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 16px 64px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      background: #f7f7f8;
      color: #18181b;
      line-height: 1.5;
      font-size: 14px;
    }
    main { max-width: 880px; margin: 0 auto; }
    h1 { font-size: 28px; margin: 0 0 4px; }
    h2 {
      font-size: 16px;
      margin: 32px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e4e4e7;
      letter-spacing: -0.01em;
    }
    .notice {
      background: #fef3c7;
      border: 1px solid #fde68a;
      color: #78350f;
      border-radius: 10px;
      padding: 14px 16px;
      margin: 16px 0 32px;
      font-size: 13px;
      line-height: 1.55;
    }
    .meta { color: #71717a; font-size: 13px; }
    .card {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td {
      text-align: left;
      padding: 10px 14px;
      vertical-align: top;
      border-bottom: 1px solid #f1f1f3;
    }
    tr:last-child td { border-bottom: none; }
    th { background: #fafafa; color: #52525b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    td.mono, code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #3f3f46; }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background: #e4e4e7;
      color: #3f3f46;
    }
    .pill.present { background: #d1fae5; color: #065f46; }
    .pill.absent  { background: #fee2e2; color: #991b1b; }
    .pill.late    { background: #fef3c7; color: #92400e; }
    .pill.excused { background: #e0e7ff; color: #3730a3; }
    .pill.success { background: #d1fae5; color: #065f46; }
    .pill.failure { background: #fee2e2; color: #991b1b; }
    .pill.pending { background: #fef3c7; color: #92400e; }
    .empty {
      padding: 18px;
      color: #71717a;
      font-style: italic;
    }
    footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e4e4e7;
      color: #71717a;
      font-size: 12px;
    }
    footer p { margin: 4px 0; }
    .grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 8px 16px;
      padding: 16px;
    }
    .grid dt { color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .grid dd { margin: 0; }
    @media print {
      body { background: #fff; padding: 0; }
      .card { box-shadow: none; }
    }
  `;
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return esc(v);
  return d.toLocaleString("de-DE");
}

function fmtDateShort(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return esc(v);
  return d.toLocaleDateString("de-DE");
}

const ATTENDANCE_LABEL: Record<string, string> = {
  present: "Anwesend",
  absent: "Abwesend",
  late: "Verspätet",
  excused: "Entschuldigt",
};

function attLabel(s: string): string {
  return ATTENDANCE_LABEL[s] ?? s;
}

function section(title: string, body: string): string {
  return `<h2>${esc(title)}</h2><div class="card">${body}</div>`;
}

function emptyState(msg: string): string {
  return `<div class="empty">${esc(msg)}</div>`;
}

function listOrEmpty<T>(arr: T[], render: (a: T[]) => string): string {
  return arr.length === 0 ? emptyState("Keine Einträge.") : render(arr);
}

// ── header ────────────────────────────────────────────────────────────────

function header(data: UserExport): string {
  return `
    <h1>Ihr Mekteb-Datenexport</h1>
    <p class="meta">Erstellt am ${esc(new Date(data.generated_at).toLocaleString("de-DE"))}</p>
    <div class="notice">
      Dieser Export wurde auf Ihre Anfrage gemäß DSGVO Art. 15 erstellt.
      Er enthält alle personenbezogenen Daten, die wir über Sie gespeichert haben.
      Bitte behandeln Sie diese Datei vertraulich.
    </div>
  `;
}

// ── account ───────────────────────────────────────────────────────────────

function accountTable(data: UserExport): string {
  const u = data.auth_user;
  const p = data.profile as
    | { full_name?: string | null; display_name?: string | null; phone?: string | null; avatar_url?: string | null }
    | null;
  return `
    <dl class="grid">
      <dt>Nutzer-ID</dt><dd><code>${esc(data.user_id)}</code></dd>
      <dt>E-Mail</dt><dd>${esc(u?.email ?? "—")}</dd>
      <dt>Anzeigename</dt><dd>${esc(p?.display_name ?? p?.full_name ?? "—")}</dd>
      <dt>Telefon</dt><dd>${esc(p?.phone ?? "—")}</dd>
      <dt>Konto erstellt</dt><dd>${fmtDate(u?.created_at)}</dd>
      <dt>E-Mail bestätigt</dt><dd>${fmtDate(u?.email_confirmed_at)}</dd>
      <dt>Letzte Anmeldung</dt><dd>${fmtDate(u?.last_sign_in_at)}</dd>
    </dl>
  `;
}

// ── tables ────────────────────────────────────────────────────────────────

type Membership = {
  mosque_id: string;
  role: string;
  is_active: boolean | null;
  created_at: string | null;
};
const ROLE_LABEL: Record<string, string> = {
  mosque_admin: "Admin",
  teacher: "Lehrer",
  parent: "Elternteil",
  student: "Schüler",
};

function membershipsTable(rows: Membership[]): string {
  return `<table>
    <thead><tr><th>Moschee</th><th>Rolle</th><th>Aktiv</th><th>Seit</th></tr></thead>
    <tbody>${rows
      .map(
        (m) => `<tr>
        <td class="mono">${esc(m.mosque_id)}</td>
        <td>${esc(ROLE_LABEL[m.role] ?? m.role)}</td>
        <td>${m.is_active ? "Ja" : "Nein"}</td>
        <td>${fmtDateShort(m.created_at)}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

function profileBlock(rows: Record<string, unknown>[]): string {
  return rows
    .map((r) => {
      const entries = Object.entries(r).filter(
        ([k]) => !["created_by", "updated_by", "mosque_id"].includes(k),
      );
      return `<dl class="grid">${entries
        .map(
          ([k, v]) =>
            `<dt>${esc(k)}</dt><dd>${
              v === null || v === undefined
                ? "—"
                : typeof v === "object"
                  ? `<code>${esc(JSON.stringify(v))}</code>`
                  : esc(v)
            }</dd>`,
        )
        .join("")}</dl>`;
    })
    .join("");
}

type Link = {
  parent_profile_id: string;
  student_profile_id: string;
  is_primary: boolean | null;
  created_at: string | null;
};
function linksTable(rows: Link[]): string {
  return `<table>
    <thead><tr><th>Eltern-ID</th><th>Schüler-ID</th><th>Hauptkontakt</th><th>Seit</th></tr></thead>
    <tbody>${rows
      .map(
        (l) => `<tr>
        <td class="mono">${esc(l.parent_profile_id)}</td>
        <td class="mono">${esc(l.student_profile_id)}</td>
        <td>${l.is_primary ? "Ja" : "Nein"}</td>
        <td>${fmtDateShort(l.created_at)}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Enrollment = {
  group_id: string;
  student_profile_id: string;
  is_active: boolean | null;
  created_at: string | null;
};
function enrollmentsTable(rows: Enrollment[]): string {
  return `<table>
    <thead><tr><th>Gruppen-ID</th><th>Schüler-ID</th><th>Aktiv</th><th>Seit</th></tr></thead>
    <tbody>${rows
      .map(
        (e) => `<tr>
        <td class="mono">${esc(e.group_id)}</td>
        <td class="mono">${esc(e.student_profile_id)}</td>
        <td>${e.is_active ? "Ja" : "Nein"}</td>
        <td>${fmtDateShort(e.created_at)}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Attendance = {
  session_id: string;
  student_profile_id: string;
  status: string;
  created_at: string | null;
};
function attendanceTable(rows: Attendance[]): string {
  return `<table>
    <thead><tr><th>Datum</th><th>Sitzung</th><th>Schüler</th><th>Status</th></tr></thead>
    <tbody>${rows
      .map(
        (a) => `<tr>
        <td>${fmtDate(a.created_at)}</td>
        <td class="mono">${esc(a.session_id)}</td>
        <td class="mono">${esc(a.student_profile_id)}</td>
        <td><span class="pill ${esc(a.status)}">${esc(attLabel(a.status))}</span></td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Target = {
  homework_id: string;
  student_profile_id: string;
  created_at: string | null;
};
function targetsTable(rows: Target[]): string {
  return `<table>
    <thead><tr><th>Hausaufgabe</th><th>Schüler</th><th>Zugewiesen am</th></tr></thead>
    <tbody>${rows
      .map(
        (t) => `<tr>
        <td class="mono">${esc(t.homework_id)}</td>
        <td class="mono">${esc(t.student_profile_id)}</td>
        <td>${fmtDateShort(t.created_at)}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Submission = {
  homework_id: string;
  student_profile_id: string;
  acknowledged_at?: string | null;
  created_at?: string | null;
};
function submissionsTable(rows: Submission[]): string {
  return `<table>
    <thead><tr><th>Hausaufgabe</th><th>Schüler</th><th>Bestätigt am</th></tr></thead>
    <tbody>${rows
      .map(
        (s) => `<tr>
        <td class="mono">${esc(s.homework_id)}</td>
        <td class="mono">${esc(s.student_profile_id)}</td>
        <td>${fmtDate(s.acknowledged_at ?? s.created_at)}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Note = {
  student_profile_id: string;
  body: string | null;
  visible_to_parents: boolean | null;
  created_at: string | null;
};
function notesTable(rows: Note[]): string {
  return `<table>
    <thead><tr><th>Datum</th><th>Schüler</th><th>Für Eltern sichtbar</th><th>Notiz</th></tr></thead>
    <tbody>${rows
      .map(
        (n) => `<tr>
        <td>${fmtDateShort(n.created_at)}</td>
        <td class="mono">${esc(n.student_profile_id)}</td>
        <td>${n.visible_to_parents ? "Ja" : "Nein"}</td>
        <td>${esc(n.body ?? "")}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Completion = {
  lesson_id: string;
  student_profile_id: string;
  completed_at?: string | null;
  created_at?: string | null;
};
function completionsTable(rows: Completion[]): string {
  return `<table>
    <thead><tr><th>Lektion</th><th>Schüler</th><th>Abgeschlossen am</th></tr></thead>
    <tbody>${rows
      .map(
        (c) => `<tr>
        <td class="mono">${esc(c.lesson_id)}</td>
        <td class="mono">${esc(c.student_profile_id)}</td>
        <td>${fmtDate(c.completed_at ?? c.created_at)}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Participation = {
  thread_id: string;
  last_read_at: string | null;
  created_at: string | null;
};
function participationsTable(rows: Participation[]): string {
  return `<table>
    <thead><tr><th>Konversation</th><th>Beigetreten</th><th>Zuletzt gelesen</th></tr></thead>
    <tbody>${rows
      .map(
        (p) => `<tr>
        <td class="mono">${esc(p.thread_id)}</td>
        <td>${fmtDate(p.created_at)}</td>
        <td>${fmtDate(p.last_read_at)}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Msg = {
  thread_id: string;
  body: string | null;
  created_at: string | null;
};
function messagesTable(rows: Msg[]): string {
  return `<table>
    <thead><tr><th>Datum</th><th>Konversation</th><th>Nachricht</th></tr></thead>
    <tbody>${rows
      .map(
        (m) => `<tr>
        <td>${fmtDate(m.created_at)}</td>
        <td class="mono">${esc(m.thread_id)}</td>
        <td>${esc(m.body ?? "")}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Notif = {
  subject: string | null;
  body: string | null;
  channel: string;
  status: string;
  is_read: boolean | null;
  created_at: string | null;
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend",
  sent: "Gesendet",
  failed: "Fehlgeschlagen",
  processing: "In Bearbeitung",
  completed: "Abgeschlossen",
  rejected: "Abgelehnt",
};
const CHANNEL_LABEL: Record<string, string> = {
  email: "E-Mail",
  push: "Push",
  sms: "SMS",
};

function notificationsTable(rows: Notif[]): string {
  return `<table>
    <thead><tr><th>Datum</th><th>Betreff</th><th>Kanal</th><th>Status</th><th>Gelesen</th></tr></thead>
    <tbody>${rows
      .map(
        (n) => `<tr>
        <td>${fmtDate(n.created_at)}</td>
        <td>${esc(n.subject ?? "")}<br/><span class="meta">${esc(n.body ?? "")}</span></td>
        <td>${esc(CHANNEL_LABEL[n.channel] ?? n.channel)}</td>
        <td><span class="pill">${esc(STATUS_LABEL[n.status] ?? n.status)}</span></td>
        <td>${n.is_read ? "Ja" : "Nein"}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type Login = {
  success: boolean | null;
  email: string | null;
  created_at: string | null;
  mosque_id: string | null;
};
function loginTable(rows: Login[]): string {
  return `<table>
    <thead><tr><th>Datum</th><th>E-Mail</th><th>Ergebnis</th></tr></thead>
    <tbody>${rows
      .map(
        (l) => `<tr>
        <td>${fmtDate(l.created_at)}</td>
        <td>${esc(l.email ?? "")}</td>
        <td><span class="pill ${l.success ? "success" : "failure"}">${l.success ? "Erfolgreich" : "Fehlgeschlagen"}</span></td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type AuditRow = {
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: unknown;
  created_at: string | null;
};
function auditTable(rows: AuditRow[]): string {
  return `<table>
    <thead><tr><th>Datum</th><th>Aktion</th><th>Ziel</th><th>Details</th></tr></thead>
    <tbody>${rows
      .map(
        (a) => `<tr>
        <td>${fmtDate(a.created_at)}</td>
        <td><code>${esc(a.action)}</code></td>
        <td class="mono">${esc(a.target_table ?? "")} ${a.target_id ? esc(a.target_id.slice(0, 8)) : ""}</td>
        <td><code>${a.metadata ? esc(JSON.stringify(a.metadata)) : ""}</code></td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

type GdprRow = {
  type: string;
  status: string;
  reason: string | null;
  requested_at: string;
  processed_at: string | null;
};
const TYPE_LABEL: Record<string, string> = {
  export: "Export",
  deletion: "Löschung",
};

function gdprRequestsTable(rows: GdprRow[]): string {
  return `<table>
    <thead><tr><th>Beantragt am</th><th>Typ</th><th>Status</th><th>Grund</th><th>Bearbeitet am</th></tr></thead>
    <tbody>${rows
      .map(
        (r) => `<tr>
        <td>${fmtDate(r.requested_at)}</td>
        <td>${esc(TYPE_LABEL[r.type] ?? r.type)}</td>
        <td><span class="pill">${esc(STATUS_LABEL[r.status] ?? r.status)}</span></td>
        <td>${esc(r.reason ?? "")}</td>
        <td>${fmtDate(r.processed_at)}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}
