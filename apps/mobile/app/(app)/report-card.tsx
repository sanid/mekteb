import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { ParentChild, ReportCard } from "@/lib/types";
import {
  Avatar,
  Card,
  ErrorNotice,
  FirstLoad,
  SectionTitle,
} from "@/components/ui";
import { space, usePalette } from "@/theme";

/**
 * One student's report card, computed on demand — the same numbers the web
 * `/admin/report` page produces, but for the student themself (or a parent
 * reading one of their children's). Gated server-side on the `annual_report`
 * plugin.
 *
 * A parent with several children picks one; a parent with exactly one skips
 * the picker; a student never sees it.
 */
export default function ReportCardScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  // `null` = still resolving. A student's `/parent/children` 403s, which is
  // how this screen tells a student apart from a parent.
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const children = useResource<ParentChild[]>(
    "parent/children",
    useCallback(() => api<ParentChild[]>("/parent/children"), []),
    { fallbackError: tm("childrenLoadFailed") },
  );

  const resolving = children.data === null && !children.error;
  const childList = children.data ?? [];
  const isParent = !resolving && !children.error && children.data !== null;
  const autoChild = isParent && childList.length === 1 ? childList[0] : null;
  const activeChildId = selectedChild ?? autoChild?.id ?? null;
  const childMode = isParent && activeChildId !== null;

  const report = useResource<ReportCard>(
    resolving ? null : childMode ? `report-card/${activeChildId}` : "report-card",
    useCallback(
      () => api<ReportCard>(`/report-card${childMode ? `?studentId=${activeChildId}` : ""}`),
      [childMode, activeChildId],
    ),
    { fallbackError: tm("reportLoadFailed") },
  );

  // Nothing has loaded yet and the parent/student split is unresolved.
  if (resolving) {
    return (
      <>
        <Stack.Screen options={{ title: tm("reportCard") }} />
        <FirstLoad error={null} />
      </>
    );
  }

  // A parent with no children has nothing to read.
  if (isParent && childList.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: tm("reportCard") }} />
        <View style={{ flex: 1, padding: space.xl, backgroundColor: palette.background }}>
          <ErrorNotice message={tm("noChildren")} />
        </View>
      </>
    );
  }

  if (report.data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("reportCard") }} />
        <FirstLoad error={report.error} />
      </>
    );
  }

  const r = report.data;
  const lessonRate =
    r.totalLessons > 0 ? Math.round((r.lessonsCompleted / r.totalLessons) * 100) : null;

  const stat = (label: string, value: string) => (
    <Card style={{ flex: 1, minWidth: "45%", gap: 2 }}>
      <Text
        style={{
          color: palette.muted,
          fontSize: 12,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <Text style={{ color: palette.foreground, fontSize: 18, fontWeight: "700" }}>{value}</Text>
    </Card>
  );

  return (
    <>
      <Stack.Screen options={{ title: tm("reportCard") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.md,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl refreshing={report.refreshing} onRefresh={report.refresh} tintColor={palette.muted} />
        }
      >
        {isParent && childList.length > 1 ? (
          <View style={{ gap: space.sm }}>
            <SectionTitle>{tm("myChildren")}</SectionTitle>
            {childList.map((c) => (
              <Card
                key={c.id}
                onPress={() => setSelectedChild(c.id)}
                style={{ padding: space.md }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Avatar name={c.fullName} size={36} />
                  <Text
                    style={{ flex: 1, color: palette.foreground, fontWeight: "600", fontSize: 14 }}
                  >
                    {c.fullName}
                  </Text>
                  {c.id === activeChildId ? (
                    <Text style={{ color: palette.accent, fontWeight: "700" }}>✓</Text>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {report.error ? <ErrorNotice message={report.error} /> : null}

        <Card style={{ gap: 4 }}>
          <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 18 }}>
            {r.studentName}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 12 }}>
            {tm("reportSince")}{" "}
            {formatDate(r.since, { day: "numeric", month: "long", year: "numeric" })}
          </Text>
          {r.groups.length > 0 ? (
            <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
              {r.groups.join(" · ")}
            </Text>
          ) : null}
        </Card>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {stat(tm("reportAttendance"), r.attendanceRate !== null ? `${r.attendanceRate}%` : "—")}
          {stat(tm("reportLessons"), lessonRate !== null ? `${lessonRate}%` : "—")}
          {stat(tm("reportExamsPassed"), String(r.examsPassed))}
          {stat(tm("reportExamsFailed"), String(r.examsFailed))}
        </View>

        <Text style={{ color: palette.faint, fontSize: 12 }}>
          {tm("reportAttendanceDetail", { present: r.attendancePresent, total: r.attendanceTotal })}
          {" · "}
          {tm("reportLessonsDetail", { done: r.lessonsCompleted, total: r.totalLessons })}
        </Text>

        {r.hifz.length > 0 ? (
          <View style={{ gap: space.xs }}>
            <SectionTitle>{tm("reportHifz")}</SectionTitle>
            {r.hifz.map((h, i) => (
              <Card key={i} style={{ padding: space.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 14 }}>
                    {h.groupName}
                  </Text>
                  <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 14 }}>
                    {h.pages} {tm("reportPages")}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
