import { getLocale, getTranslations } from "next-intl/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import { requireAdmin } from "@/lib/auth";
import { registerPdfFonts } from "@/lib/pdf-fonts";
import { createClient } from "@/lib/supabase/server";
import { dateFormatLocale } from "@/lib/format";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ locale: string }> };

function getFullWeekdayName(dayIndex: number, locale: string): string {
  // May 24, 2026 is a Sunday
  const date = new Date(2026, 4, 24 + dayIndex);
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
}

export async function GET(req: Request, { params }: RouteParams) {
  const { locale } = await params;
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  registerPdfFonts();

  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const dayParam = searchParams.get("day");
  const dayOfWeek = dayParam !== null ? parseInt(dayParam, 10) : null;

  // Fetch all necessary data
  const [
    { data: mosque },
    { data: categories },
    { data: schedules },
    { data: groups },
    { data: teacherLinks }
  ] = await Promise.all([
    supabase.from("mosques").select("name").eq("id", ctx.mosqueId).maybeSingle(),
    supabase.from("group_categories").select("id, name, color").eq("mosque_id", ctx.mosqueId),
    supabase.from("teaching_schedules").select("id, category_id, group_id, day_of_week, start_time, end_time").eq("mosque_id", ctx.mosqueId),
    supabase.from("groups").select("id, name, room, category_id").eq("mosque_id", ctx.mosqueId).eq("is_active", true).order("name"),
    supabase.from("teacher_group_links").select("group_id, teacher_profiles(profiles(full_name, display_name))").eq("mosque_id", ctx.mosqueId).eq("is_active", true)
  ]);

  const mosqueName = mosque?.name ?? "Mosque";
  const activeGroupIds = new Set(groups?.map(g => g.id) ?? []);
  
  // Filter schedules to only include active groups
  const activeSchedules = (schedules ?? []).filter(s => s.group_id && activeGroupIds.has(s.group_id));

  // Build lookups
  const groupsMap = new Map(groups?.map(g => [g.id, g]) ?? []);
  const categoriesMap = new Map(categories?.map(c => [c.id, c]) ?? []);

  // Build teacher lookup
  const groupTeachersMap = new Map<string, string[]>();
  for (const link of teacherLinks ?? []) {
    if (!link.group_id) continue;
    const teacherData = link.teacher_profiles;
    const name = teacherData?.profiles?.display_name || teacherData?.profiles?.full_name;
    if (name) {
      const arr = groupTeachersMap.get(link.group_id) ?? [];
      arr.push(name);
      groupTeachersMap.set(link.group_id, arr);
    }
  }

  // Date formatting helpers
  const dateLocale = dateFormatLocale(locale);
  const fmtDate = (d: Date) => d.toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" });
  const printedAt = fmtDate(new Date());

  const timeHeaderLabel = ({ de: "Zeit", en: "Time", bs: "Vrijeme", tr: "Saat" } as const)[locale as "de" | "en" | "bs" | "tr"] ?? "Zeit";

  if (dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6) {
    // ----------------------------------------------------
    // DAY-SPECIFIC PORTRAIT SCHEDULE
    // ----------------------------------------------------
    const dayName = getFullWeekdayName(dayOfWeek, dateLocale);
    
    // Filter & sort schedules for this day
    const daySchedules = activeSchedules
      .filter(s => s.day_of_week === dayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    const dayStyles = StyleSheet.create({
      page: { padding: 40, fontFamily: "Noto Serif", backgroundColor: "#ffffff", fontSize: 10 },
      header: { borderBottomWidth: 2, borderBottomColor: "#10b981", paddingBottom: 12, marginBottom: 24 },
      mosqueName: { fontSize: 16, fontWeight: "bold", color: "#10b981", marginBottom: 4 },
      title: { fontSize: 22, fontWeight: "bold", color: "#111827" },
      metaText: { fontSize: 9, color: "#6b7280", marginTop: 4 },
      list: { flexDirection: "column", gap: 12 },
      card: { flexDirection: "row", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 16, alignItems: "center", backgroundColor: "#ffffff" },
      timeSection: { width: 120, borderRightWidth: 1, borderRightColor: "#e5e7eb", paddingRight: 16, marginRight: 16 },
      timeRange: { fontSize: 12, fontWeight: "bold", color: "#111827" },
      dayNameLabel: { fontSize: 9, color: "#6b7280", marginTop: 2, textTransform: "uppercase" },
      infoSection: { flex: 1 },
      groupName: { fontSize: 14, fontWeight: "bold", color: "#111827", marginBottom: 4 },
      categoryBadge: { alignSelf: "flex-start", fontSize: 8, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 6, color: "#ffffff" },
      teacherSection: { marginTop: 4 },
      teacherLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase" },
      teacherNames: { fontSize: 10, color: "#4b5563" },
      roomSection: { marginTop: 4 },
      roomLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase" },
      roomText: { fontSize: 10, color: "#4b5563" },
      noActivities: { textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 40 },
      footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
      footerText: { fontSize: 8, color: "#9ca3af" },
    });

    const doc = (
      <Document title={`${t("weeklySchedule")} - ${dayName} - ${mosqueName}`}>
        <Page size="A4" style={dayStyles.page}>
          <View style={dayStyles.header}>
            <Text style={dayStyles.mosqueName}>{mosqueName}</Text>
            <Text style={dayStyles.title}>{dayName}</Text>
            <Text style={dayStyles.metaText}>{t("weeklySchedule")}</Text>
          </View>

          {daySchedules.length === 0 ? (
            <Text style={dayStyles.noActivities}>{t("noSchedule")}</Text>
          ) : (
            <View style={dayStyles.list}>
              {daySchedules.map((s) => {
                const group = s.group_id ? groupsMap.get(s.group_id) : null;
                const cat = group?.category_id ? categoriesMap.get(group.category_id) : null;
                const catColor = cat?.color ?? "#6b7280";
                const teachers = s.group_id ? groupTeachersMap.get(s.group_id) : null;
                const teachersStr = teachers && teachers.length > 0 ? teachers.join(", ") : "—";
                const timeRange = `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`;

                return (
                  <View key={s.id || `${s.group_id}-${s.day_of_week}`} style={[dayStyles.card, { borderLeftWidth: 4, borderLeftColor: catColor }]}>
                    <View style={dayStyles.timeSection}>
                      <Text style={dayStyles.timeRange}>{timeRange}</Text>
                      <Text style={dayStyles.dayNameLabel}>{dayName}</Text>
                    </View>
                    <View style={dayStyles.infoSection}>
                      {cat && (
                        <Text style={[dayStyles.categoryBadge, { backgroundColor: catColor }]}>
                          {cat.name}
                        </Text>
                      )}
                      <Text style={dayStyles.groupName}>{group?.name ?? "Group"}</Text>
                      <View style={dayStyles.teacherSection}>
                        <Text style={dayStyles.teacherLabel}>{t("teachers")}</Text>
                        <Text style={dayStyles.teacherNames}>{teachersStr}</Text>
                      </View>
                      {group?.room && (
                        <View style={dayStyles.roomSection}>
                          <Text style={dayStyles.roomLabel}>{t("room")}</Text>
                          <Text style={dayStyles.roomText}>{group.room}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={dayStyles.footer}>
            <Text style={dayStyles.footerText}>{t("printedOn")}: {printedAt}</Text>
            <Text style={dayStyles.footerText}>Mekteb</Text>
          </View>
        </Page>
      </Document>
    );

    const buffer = await renderToBuffer(doc);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="schedule-${dayName.toLowerCase()}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } else {
    // ----------------------------------------------------
    // WEEKLY TIMETABLE LANDSCAPE GRID
    // ----------------------------------------------------
    // Extract unique sorted time slots (HH:MM - HH:MM)
    const uniqueTimeSlotsSet = new Set<string>();
    for (const s of activeSchedules) {
      if (s.start_time && s.end_time) {
        const formatted = `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`;
        uniqueTimeSlotsSet.add(formatted);
      }
    }
    const uniqueTimeSlots = Array.from(uniqueTimeSlotsSet).sort((a, b) => a.localeCompare(b));

    const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun

    const styles = StyleSheet.create({
      page: { padding: 24, fontFamily: "Noto Serif", backgroundColor: "#ffffff" },
      header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: "#10b981", paddingBottom: 8, marginBottom: 16 },
      mosqueName: { fontSize: 14, fontWeight: "bold", color: "#111827" },
      title: { fontSize: 18, fontWeight: "bold", color: "#10b981" },
      metaText: { fontSize: 8, color: "#6b7280", textAlign: "right" },
      table: { flexDirection: "column", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
      tableHeaderRow: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", alignItems: "center" },
      tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", minHeight: 50 },
      headerCell: { padding: 6, fontSize: 8, fontWeight: "bold", color: "#374151", textAlign: "center" },
      timeCell: { width: 65, padding: 6, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: "#e5e7eb", backgroundColor: "#f9fafb" },
      timeText: { fontSize: 8, fontWeight: "bold", color: "#374151" },
      dayCell: { width: 104, padding: 4, borderRightWidth: 1, borderRightColor: "#e5e7eb", justifyContent: "flex-start", gap: 4 },
      groupCard: { padding: 4, borderRadius: 2, borderLeftWidth: 3, backgroundColor: "#f9fafb", marginBottom: 4 },
      groupName: { fontSize: 8, fontWeight: "bold", color: "#111827" },
      groupMeta: { fontSize: 7, color: "#4b5563", marginTop: 1 },
      groupTeacher: { fontSize: 7, color: "#6b7280", marginTop: 1 },
      groupRoom: { fontSize: 7, color: "#6b7280", marginTop: 1 },
      noActivities: { textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 10 },
      footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
      footerText: { fontSize: 7, color: "#9ca3af" },
    });

    const doc = (
      <Document title={`${t("weeklySchedule")} - ${mosqueName}`}>
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.mosqueName}>{mosqueName}</Text>
              <Text style={styles.title}>{t("weeklySchedule")}</Text>
            </View>
            <View>
              <Text style={styles.metaText}>{t("printedOn")}: {printedAt}</Text>
            </View>
          </View>

          {uniqueTimeSlots.length === 0 ? (
            <View style={styles.table}>
              <Text style={styles.noActivities}>{t("noSchedule")}</Text>
            </View>
          ) : (
            <View style={styles.table}>
              {/* Header row */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerCell, { width: 65 }]}>{timeHeaderLabel}</Text>
                {WEEKDAY_ORDER.map((day) => (
                  <Text key={day} style={[styles.headerCell, { width: 104 }]}>
                    {getFullWeekdayName(day, dateLocale)}
                  </Text>
                ))}
              </View>

              {/* Data rows */}
              {uniqueTimeSlots.map((slot) => (
                <View key={slot} style={styles.tableRow}>
                  {/* Time column */}
                  <View style={styles.timeCell}>
                    <Text style={styles.timeText}>{slot}</Text>
                  </View>

                  {/* Day columns */}
                  {WEEKDAY_ORDER.map((day) => {
                    const matches = activeSchedules.filter((s) => {
                      if (s.day_of_week !== day) return false;
                      const sSlot = `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`;
                      return sSlot === slot;
                    });

                    return (
                      <View key={day} style={styles.dayCell}>
                        {matches.map((s) => {
                          const group = s.group_id ? groupsMap.get(s.group_id) : null;
                          const cat = group?.category_id ? categoriesMap.get(group.category_id) : null;
                          const catColor = cat?.color ?? "#6b7280";
                          const teachers = s.group_id ? groupTeachersMap.get(s.group_id) : null;
                          const teachersStr = teachers && teachers.length > 0 ? teachers.join(", ") : "";

                          return (
                            <View key={s.id || `${s.group_id}-${s.day_of_week}`} style={[styles.groupCard, { borderLeftColor: catColor }]}>
                              <Text style={styles.groupName}>{group?.name ?? "Group"}</Text>
                              {cat && <Text style={styles.groupMeta}>{cat.name}</Text>}
                              {teachersStr && <Text style={styles.groupTeacher}>{teachersStr}</Text>}
                              {group?.room && <Text style={styles.groupRoom}>{`${t("room")}: ${group.room}`}</Text>}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>{mosqueName}</Text>
            <Text style={styles.footerText}>Mekteb</Text>
          </View>
        </Page>
      </Document>
    );

    const buffer = await renderToBuffer(doc);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="weekly-schedule.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
}
