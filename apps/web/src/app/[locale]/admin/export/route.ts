import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await requireAdmin();
  const supabase = createAdminClient();

  const exportedAt = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  const [
    { data: mosque },
    { data: groups },
    { data: students },
    { data: teachers },
    { data: parents },
    { data: lessons },
    { data: attendance },
    { data: exams },
    { data: homework },
    { data: events },
  ] = await Promise.all([
    supabase.from("mosques").select("name, slug, locale, timezone, school_year_start, state").eq("id", ctx.mosqueId).single(),
    supabase.from("groups").select("id, name, is_active, group_categories(name, color), teaching_schedules(day_of_week, start_time, end_time)").eq("mosque_id", ctx.mosqueId).order("name"),
    supabase.from("student_profiles").select("id, full_name, date_of_birth, created_at").eq("mosque_id", ctx.mosqueId).order("full_name"),
    supabase.from("teacher_profiles").select("id, bio, is_active, created_at, profiles(full_name, phone)").eq("mosque_id", ctx.mosqueId).order("created_at"),
    supabase.from("parent_profiles").select("id, relation, is_active, created_at, profiles(full_name, phone), parent_student_links(student_profiles(full_name))").eq("mosque_id", ctx.mosqueId).order("created_at"),
    supabase.from("lessons").select("id, title, is_published, created_at, topics(title)").eq("mosque_id", ctx.mosqueId).order("created_at", { ascending: false }),
    supabase.from("attendance_sessions").select("id, session_date, groups(name), attendance_records(status, student_profiles(full_name))").eq("mosque_id", ctx.mosqueId).order("session_date", { ascending: false }).limit(500),
    supabase.from("exam_sessions").select("id, exam_date, status, summary, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name)").eq("mosque_id", ctx.mosqueId).order("exam_date", { ascending: false }).limit(500),
    supabase.from("homework_assignments").select("id, title, due_date, groups(name), created_at").eq("mosque_id", ctx.mosqueId).order("created_at", { ascending: false }).limit(500),
    supabase.from("calendar_events").select("id, title, date, start_time, end_time, visibility").eq("mosque_id", ctx.mosqueId).order("date", { ascending: false }).limit(200),
  ]);

  const DAYS: Record<number, string> = { 0: "Mo", 1: "Di", 2: "Mi", 3: "Do", 4: "Fr", 5: "Sa", 6: "So" };

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Datenexport — ${mosque?.name ?? "Moschee"}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #111; background: #fff; margin: 0; padding: 32px 48px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 40px 0 12px; border-bottom: 2px solid #16a34a; padding-bottom: 6px; color: #15803d; }
  h3 { font-size: 13px; font-weight: 700; margin: 20px 0 6px; color: #374151; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 32px; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-gray  { background: #f3f4f6; color: #6b7280; }
  .badge-blue  { background: #dbeafe; color: #1d4ed8; }
  .badge-red   { background: #fee2e2; color: #dc2626; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; padding: 6px 10px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  td { padding: 6px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .toc { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px; }
  .toc h2 { margin-top: 0; font-size: 13px; border: none; padding: 0; color: #374151; }
  .toc ol { margin: 8px 0 0; padding-left: 20px; line-height: 2; }
  .toc a { color: #15803d; text-decoration: none; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
  .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
  .summary-card .num { font-size: 28px; font-weight: 800; color: #15803d; }
  .summary-card .label { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  @media print {
    body { padding: 16px; }
    h2 { page-break-before: always; }
    h2:first-of-type { page-break-before: avoid; }
    table { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<h1>📋 Datenexport — ${mosque?.name ?? "Moschee"}</h1>
<div class="meta">
  Exportiert am ${exportedAt} &nbsp;·&nbsp;
  Slug: <code>${mosque?.slug ?? ""}</code> &nbsp;·&nbsp;
  Sprache: ${mosque?.locale ?? "de"} &nbsp;·&nbsp;
  Zeitzone: ${mosque?.timezone ?? "Europe/Berlin"}
  ${mosque?.state ? `&nbsp;·&nbsp; Bundesland: ${mosque.state}` : ""}
</div>

<div class="toc">
  <h2>Inhaltsverzeichnis</h2>
  <ol>
    <li><a href="#zusammenfassung">Zusammenfassung</a></li>
    <li><a href="#gruppen">Gruppen (${groups?.length ?? 0})</a></li>
    <li><a href="#schueler">Schüler (${students?.length ?? 0})</a></li>
    <li><a href="#lehrer">Lehrer (${teachers?.length ?? 0})</a></li>
    <li><a href="#eltern">Eltern (${parents?.length ?? 0})</a></li>
    <li><a href="#lektionen">Lektionen (${lessons?.length ?? 0})</a></li>
    <li><a href="#hausaufgaben">Hausaufgaben (${homework?.length ?? 0})</a></li>
    <li><a href="#anwesenheit">Anwesenheitserfassungen (${attendance?.length ?? 0})</a></li>
    <li><a href="#pruefungen">Prüfungssitzungen (${exams?.length ?? 0})</a></li>
    <li><a href="#events">Kalenderevents (${events?.length ?? 0})</a></li>
  </ol>
</div>

<h2 id="zusammenfassung">1. Zusammenfassung</h2>
<div class="summary-grid">
  <div class="summary-card"><div class="num">${students?.length ?? 0}</div><div class="label">Schüler</div></div>
  <div class="summary-card"><div class="num">${teachers?.length ?? 0}</div><div class="label">Lehrer</div></div>
  <div class="summary-card"><div class="num">${parents?.length ?? 0}</div><div class="label">Eltern</div></div>
  <div class="summary-card"><div class="num">${groups?.length ?? 0}</div><div class="label">Gruppen</div></div>
</div>

<h2 id="gruppen">2. Gruppen</h2>
${groups && groups.length > 0 ? `
<table>
  <thead><tr><th>Name</th><th>Kategorie</th><th>Zeitplan</th><th>Status</th></tr></thead>
  <tbody>
    ${groups.map((g) => {
      const cat = g.group_categories as { name: string; color: string } | null;
      const scheds = (g.teaching_schedules as { day_of_week: number; start_time: string; end_time: string }[] | null) ?? [];
      const schedStr = scheds.length > 0
        ? scheds.map((s) => `${DAYS[s.day_of_week] ?? s.day_of_week} ${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)}`).join(", ")
        : "—";
      return `<tr>
        <td><strong>${g.name}</strong></td>
        <td>${cat ? `<span class="color-dot" style="background:${cat.color}"></span>${cat.name}` : "—"}</td>
        <td>${schedStr}</td>
        <td><span class="badge ${g.is_active ? "badge-green" : "badge-gray"}">${g.is_active ? "Aktiv" : "Inaktiv"}</span></td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : "<p>Keine Gruppen vorhanden.</p>"}

<h2 id="schueler">3. Schüler</h2>
${students && students.length > 0 ? `
<table>
  <thead><tr><th>#</th><th>Name</th><th>Geburtsdatum</th><th>Registriert am</th></tr></thead>
  <tbody>
    ${students.map((s, i) => `<tr>
      <td>${i + 1}</td>
      <td><strong>${s.full_name}</strong></td>
      <td>${s.date_of_birth ?? "—"}</td>
      <td>${new Date(s.created_at).toLocaleDateString("de-DE")}</td>
    </tr>`).join("")}
  </tbody>
</table>` : "<p>Keine Schüler vorhanden.</p>"}

<h2 id="lehrer">4. Lehrer</h2>
${teachers && teachers.length > 0 ? `
<table>
  <thead><tr><th>#</th><th>Name</th><th>Telefon</th><th>Bio</th><th>Status</th><th>Registriert am</th></tr></thead>
  <tbody>
    ${teachers.map((t, i) => {
      const profile = t.profiles as { full_name: string | null; phone: string | null } | null;
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${profile?.full_name ?? "—"}</strong></td>
        <td>${profile?.phone ?? "—"}</td>
        <td>${t.bio ?? "—"}</td>
        <td><span class="badge ${t.is_active ? "badge-green" : "badge-gray"}">${t.is_active ? "Aktiv" : "Inaktiv"}</span></td>
        <td>${new Date(t.created_at).toLocaleDateString("de-DE")}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : "<p>Keine Lehrer vorhanden.</p>"}

<h2 id="eltern">5. Eltern</h2>
${parents && parents.length > 0 ? `
<table>
  <thead><tr><th>#</th><th>Name</th><th>Telefon</th><th>Verhältnis</th><th>Verknüpfte Schüler</th><th>Registriert am</th></tr></thead>
  <tbody>
    ${parents.map((p, i) => {
      const profile = p.profiles as { full_name: string | null; phone: string | null } | null;
      const links = (p.parent_student_links as { student_profiles: { full_name: string } | null }[] | null) ?? [];
      const childNames = links.map((l) => l.student_profiles?.full_name).filter(Boolean).join(", ") || "—";
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${profile?.full_name ?? "—"}</strong></td>
        <td>${profile?.phone ?? "—"}</td>
        <td>${p.relation ?? "—"}</td>
        <td>${childNames}</td>
        <td>${new Date(p.created_at).toLocaleDateString("de-DE")}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : "<p>Keine Eltern vorhanden.</p>"}

<h2 id="lektionen">6. Lektionen</h2>
${lessons && lessons.length > 0 ? `
<table>
  <thead><tr><th>#</th><th>Titel</th><th>Thema</th><th>Status</th><th>Erstellt am</th></tr></thead>
  <tbody>
    ${lessons.map((l, i) => {
      const topic = l.topics as { title: string } | null;
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${l.title}</strong></td>
        <td>${topic?.title ?? "—"}</td>
        <td><span class="badge ${l.is_published ? "badge-green" : "badge-gray"}">${l.is_published ? "Veröffentlicht" : "Entwurf"}</span></td>
        <td>${new Date(l.created_at).toLocaleDateString("de-DE")}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : "<p>Keine Lektionen vorhanden.</p>"}

<h2 id="hausaufgaben">7. Hausaufgaben</h2>
${homework && homework.length > 0 ? `
<table>
  <thead><tr><th>#</th><th>Titel</th><th>Gruppe</th><th>Fällig am</th><th>Erstellt am</th></tr></thead>
  <tbody>
    ${homework.map((h, i) => {
      const grp = h.groups as { name: string } | null;
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${h.title}</strong></td>
        <td>${grp?.name ?? "—"}</td>
        <td>${h.due_date ? new Date(h.due_date).toLocaleDateString("de-DE") : "—"}</td>
        <td>${new Date(h.created_at).toLocaleDateString("de-DE")}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : "<p>Keine Hausaufgaben vorhanden.</p>"}

<h2 id="anwesenheit">8. Anwesenheitserfassungen</h2>
${attendance && attendance.length > 0 ? `
<p style="color:#6b7280;font-size:12px;margin-bottom:8px;">Zeigt die letzten 500 Sitzungen.</p>
<table>
  <thead><tr><th>Datum</th><th>Gruppe</th><th>Schüler</th><th>Status</th></tr></thead>
  <tbody>
    ${attendance.flatMap((session) => {
      const grp = session.groups as { name: string } | null;
      const records = (session.attendance_records as { status: string; student_profiles: { full_name: string } | null }[] | null) ?? [];
      const statusMap: Record<string, string> = { present: "Anwesend", absent: "Abwesend", late: "Verspätet", excused: "Entschuldigt" };
      const statusBadge: Record<string, string> = { present: "badge-green", absent: "badge-red", late: "badge-blue", excused: "badge-gray" };
      return records.map((r) => `<tr>
        <td>${new Date(session.session_date).toLocaleDateString("de-DE")}</td>
        <td>${grp?.name ?? "—"}</td>
        <td>${r.student_profiles?.full_name ?? "—"}</td>
        <td><span class="badge ${statusBadge[r.status] ?? "badge-gray"}">${statusMap[r.status] ?? r.status}</span></td>
      </tr>`);
    }).join("")}
  </tbody>
</table>` : "<p>Keine Anwesenheitserfassungen vorhanden.</p>"}

<h2 id="pruefungen">9. Prüfungssitzungen</h2>
${exams && exams.length > 0 ? `
<table>
  <thead><tr><th>Datum</th><th>Schüler</th><th>Gruppe</th><th>Status</th><th>Zusammenfassung</th></tr></thead>
  <tbody>
    ${exams.map((e) => {
      const student = e.student_profiles as { full_name: string } | null;
      const grp = e.groups as { name: string } | null;
      const statusMap: Record<string, string> = { scheduled: "Geplant", in_progress: "Läuft", passed: "Bestanden", failed: "Nicht bestanden" };
      const statusBadge: Record<string, string> = { scheduled: "badge-blue", in_progress: "badge-blue", passed: "badge-green", failed: "badge-red" };
      return `<tr>
        <td>${e.exam_date ? new Date(e.exam_date).toLocaleDateString("de-DE") : "—"}</td>
        <td>${student?.full_name ?? "—"}</td>
        <td>${grp?.name ?? "—"}</td>
        <td><span class="badge ${statusBadge[e.status] ?? "badge-gray"}">${statusMap[e.status] ?? e.status}</span></td>
        <td>${e.summary ?? "—"}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : "<p>Keine Prüfungssitzungen vorhanden.</p>"}

<h2 id="events">10. Kalenderevents</h2>
${events && events.length > 0 ? `
<table>
  <thead><tr><th>Datum</th><th>Titel</th><th>Uhrzeit</th><th>Sichtbarkeit</th></tr></thead>
  <tbody>
    ${events.map((e) => `<tr>
      <td>${new Date(e.date).toLocaleDateString("de-DE")}</td>
      <td><strong>${e.title}</strong></td>
      <td>${e.start_time.slice(0,5)} – ${e.end_time.slice(0,5)}</td>
      <td><span class="badge badge-gray">${e.visibility === "all" ? "Alle" : e.visibility}</span></td>
    </tr>`).join("")}
  </tbody>
</table>` : "<p>Keine Events vorhanden.</p>"}

<hr style="margin:40px 0;border:none;border-top:1px solid #e5e7eb;">
<p style="color:#9ca3af;font-size:11px;text-align:center;">
  Generiert von Mekteb &nbsp;·&nbsp; ${exportedAt} &nbsp;·&nbsp; ${mosque?.name ?? ""}
</p>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="mekteb-export-${new Date().toISOString().slice(0, 10)}.html"`,
    },
  });
}
