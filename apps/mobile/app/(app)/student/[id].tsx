import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { getLocale, tm } from "@/lib/i18n";
import type { TeacherStudentDetail } from "@/lib/types";
import { Avatar, Card, EmptyState, FirstLoad, SectionTitle } from "@/components/ui";
import { attendanceColors, space, usePalette } from "@/theme";


function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * A teacher's view of one student: attendance history, progress notes,
 * homework, hifz and parent contact details. Mirrors the web
 * `/teacher/students/[id]`; data comes from `/teacher/students/[id]` which is
 * RLS-scoped to students in the teacher's own groups.
 */
export default function TeacherStudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const STATUS_COLORS: Record<string, string> = Object.fromEntries(
    Object.entries(attendanceColors(palette)).map(([k, v]) => [k, v.fg]),
  );
  const insets = useSafeAreaInsets();
  const locale = getLocale();

  const { data: detail, error } = useResource<TeacherStudentDetail>(
    id ? `teacher/students/${id}` : null,
    useCallback(() => api<TeacherStudentDetail>(`/teacher/students/${id}`), [id]),
    { fallbackError: tm("loadFailed") },
  );

  if (detail === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("student") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: detail.student.full_name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.xl,
          paddingBottom: insets.bottom + space.xxl,
        }}
      >
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar name={detail.student.full_name} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: palette.foreground }}>
                {detail.student.full_name}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
                {formatDate(detail.student.date_of_birth)}
              </Text>
            </View>
          </View>
          {detail.groups.length > 0 ? (
            <Text style={{ color: palette.muted, fontSize: 13 }}>
              {detail.groups.map((g) => g.name).join(" · ")}
            </Text>
          ) : null}
        </Card>

        {detail.parents.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <SectionTitle>{tm("parents")}</SectionTitle>
            {detail.parents.map((p, i) => (
              <Card key={i} style={{ gap: 2 }}>
                <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 15 }}>
                  {p.name ?? "?"}
                </Text>
                {p.relation ? (
                  <Text style={{ color: palette.muted, fontSize: 12 }}>{p.relation}</Text>
                ) : null}
                {p.phone ? (
                  <Text style={{ color: palette.accent, fontSize: 13 }}>{p.phone}</Text>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}

        {detail.hifz.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <SectionTitle>{tm("hifzProgress")}</SectionTitle>
            {detail.hifz.map((h, i) => (
              <Text key={i} style={{ color: palette.foreground, fontSize: 14 }}>
                {h.groupName ?? ""}: {h.pages} {tm("hifzPages")}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          <SectionTitle>{tm("attendance")}</SectionTitle>
          {detail.attendance.length === 0 ? (
            <Text style={{ color: palette.muted, fontSize: 13 }}>{tm("noAttendance")}</Text>
          ) : (
            detail.attendance.map((r) => (
              <View
                key={r.id}
                style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: STATUS_COLORS[r.status] ?? palette.muted,
                  }}
                />
                <Text style={{ flex: 1, color: palette.foreground, fontSize: 14 }}>
                  {formatDate(r.sessionDate)}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 12 }}>
                  {r.groupName ?? ""} {tm(`status_${r.status}` as never)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ gap: space.sm }}>
          <SectionTitle>{tm("progressNotes")}</SectionTitle>
          {detail.progressNotes.length === 0 ? (
            <EmptyState icon="notes">{tm("noNotes")}</EmptyState>
          ) : (
            detail.progressNotes.map((n) => (
              <Card key={n.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>
                    {formatDate(n.createdAt)}
                  </Text>
                  {!n.visibleToParents ? (
                    <Text style={{ color: palette.muted, fontSize: 12 }}>{tm("internalOnly")}</Text>
                  ) : null}
                </View>
                <Text style={{ color: palette.foreground, fontSize: 14, lineHeight: 20 }}>{n.body}</Text>
              </Card>
            ))
          )}
        </View>

        <View style={{ gap: space.sm }}>
          <SectionTitle>{tm("homework")}</SectionTitle>
          {detail.homework.length === 0 ? (
            <Text style={{ color: palette.muted, fontSize: 13 }}>{tm("noHomeworkYet")}</Text>
          ) : (
            detail.homework.map((h) => (
              <Card key={h.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: palette.foreground, fontSize: 14 }}>{h.title}</Text>
                <Text style={{ color: palette.muted, fontSize: 12 }}>
                  {h.dueDate ? formatDate(h.dueDate) : ""}
                </Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}
