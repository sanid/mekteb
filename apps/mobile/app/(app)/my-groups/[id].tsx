import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { StudentGroupDetail } from "@/lib/types";
import { Card, Chip, EmptyState, ErrorNotice, FirstLoad, SectionTitle } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";

/**
 * One group as the enrolled student sees it: what the group is, the upcoming
 * lessons (same feed the calendar shows), the teacher's published weekly
 * summaries, and the progress notes the teacher wrote for the parent to read.
 */
export default function MyGroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const { data, error } = useResource<StudentGroupDetail>(
    id ? `student/groups/${id}` : null,
    useCallback(() => api<StudentGroupDetail>(`/student/groups/${id}`), [id]),
    { fallbackError: tm("groupLoadFailed") },
  );

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: tm("myGroups") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const { group, sessions, weekly, notes } = data;

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
      >
        {error ? <ErrorNotice message={error} /> : null}

        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: palette.foreground }}>
            {group.name}
          </Text>
          {group.room ? (
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
              {tm("groupRoom")}: {group.room}
            </Text>
          ) : null}
          {group.description ? (
            <Text style={{ color: palette.muted, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
              {group.description}
            </Text>
          ) : null}
        </Card>

        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("upcomingLessons")}</SectionTitle>
          {sessions.length === 0 ? (
            <EmptyState icon="calendar">{tm("noUpcomingLessons")}</EmptyState>
          ) : (
            sessions.map((s, i) => (
              <Animated.View
                key={s.id}
                entering={FadeInDown.delay(Math.min(i * 30, 240)).duration(200)}
              >
                <Card
                  style={
                    s.is_cancelled ? { opacity: 0.55, borderColor: palette.cardBorder } : undefined
                  }
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                    <Text
                      style={{ flex: 1, color: palette.foreground, fontWeight: "600", fontSize: 14 }}
                    >
                      {formatDate(s.date, { weekday: "long", day: "numeric", month: "long" })}
                    </Text>
                    {s.is_cancelled ? (
                      <Chip label={tm("examCancelled")} fg={palette.danger} bg={palette.dangerSubtle} />
                    ) : null}
                  </View>
                  {s.start_time ? (
                    <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                      {s.start_time.slice(0, 5)}
                      {s.end_time ? ` – ${s.end_time.slice(0, 5)}` : ""}
                    </Text>
                  ) : null}
                  {s.notes ? (
                    <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                      {s.notes}
                    </Text>
                  ) : null}
                </Card>
              </Animated.View>
            ))
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("weeklyNotes")}</SectionTitle>
          {weekly.length === 0 ? (
            <EmptyState icon="notes">{tm("noWeeklyNotes")}</EmptyState>
          ) : (
            weekly.map((w, i) => (
              <Animated.View
                key={w.id}
                entering={FadeInDown.delay(Math.min(i * 30, 240)).duration(200)}
              >
                <Card>
                  <Text style={{ color: palette.faint, fontSize: 12, fontWeight: "600" }}>
                    {tm("weekOf", {
                      date: formatDate(w.week_start, { day: "numeric", month: "long" }),
                    })}
                  </Text>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: 14,
                      lineHeight: 21,
                      marginTop: space.sm,
                    }}
                  >
                    {w.body}
                  </Text>
                </Card>
              </Animated.View>
            ))
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionTitle>{tm("teacherNotes")}</SectionTitle>
          {notes.length === 0 ? (
            <EmptyState icon="notes">{tm("noNotesYet")}</EmptyState>
          ) : (
            notes.map((n, i) => (
              <Animated.View
                key={n.id}
                entering={FadeInDown.delay(Math.min(i * 30, 240)).duration(200)}
              >
                <Card>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: 14,
                      lineHeight: 21,
                    }}
                  >
                    {n.body}
                  </Text>
                  <Text style={{ color: palette.faint, fontSize: 12, marginTop: space.sm }}>
                    {formatDate(n.created_at, { day: "numeric", month: "long" })}
                  </Text>
                </Card>
              </Animated.View>
            ))
          )}
        </View>

        {/* Keep the icon vocabulary honest: this screen is read-only info. */}
        <View style={{ height: radius.md }} />
      </ScrollView>
    </>
  );
}
