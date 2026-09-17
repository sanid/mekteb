import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { AttendanceStatus, StudentAttendanceRecord } from "@/lib/types";
import { ATTENDANCE_STATUSES } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorNotice,
  FirstLoad,
  ProgressRing,
  SectionTitle,
} from "@/components/ui";
import { attendanceColors, radius, space, usePalette } from "@/theme";

/**
 * The student's own attendance history — read-only; only a teacher writes
 * `attendance_records`.
 *
 * The rate counts *late* as attended. A child who arrived is not absent, and
 * showing them a lower number than they expect for having been marked late
 * reads as a punishment rather than a record; the per-status counts below the
 * ring keep the distinction visible.
 */
function isAttended(status: AttendanceStatus): boolean {
  return status === "present" || status === "late";
}

export default function AttendanceScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const colors = attendanceColors(palette);

  const {
    data: records,
    error,
    refreshing,
    refresh,
  } = useResource<StudentAttendanceRecord[]>(
    "student/attendance",
    useCallback(() => api<StudentAttendanceRecord[]>("/student/attendance"), []),
    { fallbackError: tm("attendanceLoadFailed") },
  );

  const counts = useMemo(() => {
    const base = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records ?? []) {
      if (r.status in base) base[r.status] += 1;
    }
    return base;
  }, [records]);

  if (records === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("attendance") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  // Excused sessions are neither credit nor fault, so they leave the
  // denominator entirely rather than dragging the rate down.
  const counted = records.filter((r) => r.status !== "excused").length;
  const attended = records.filter((r) => isAttended(r.status)).length;
  const rate = counted === 0 ? 0 : Math.round((attended / counted) * 100);

  return (
    <>
      <Stack.Screen options={{ title: tm("attendance") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />
        }
      >
        {error ? <ErrorNotice message={error} /> : null}

        {records.length === 0 ? (
          <EmptyState icon="attendance">{tm("noAttendance")}</EmptyState>
        ) : (
          <>
            <Card>
              <View style={{ alignItems: "center", gap: space.md, paddingVertical: space.sm }}>
                <ProgressRing value={rate / 100} size={132} stroke={12}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 28, fontWeight: "700", color: palette.foreground }}>
                      {rate}%
                    </Text>
                  </View>
                </ProgressRing>
                <Text style={{ color: palette.muted, fontSize: 14 }}>
                  {tm("attendanceRate")}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                {ATTENDANCE_STATUSES.map((status) => (
                  <View
                    key={status}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: space.md,
                      borderRadius: radius.md,
                      backgroundColor: colors[status].bg,
                    }}
                  >
                    <Text
                      style={{ fontSize: 18, fontWeight: "700", color: colors[status].fg }}
                    >
                      {counts[status]}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12, fontWeight: "600", color: colors[status].fg }}
                    >
                      {tm(status)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <SectionTitle>{tm("recentSessions")}</SectionTitle>
            {/* The API already returns newest first, capped at 120. */}
            {records.map((r, i) => (
              <Animated.View
                key={r.id}
                entering={FadeInDown.delay(Math.min(i, 8) * 30).duration(200)}
              >
                <Card>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.foreground, fontWeight: "700" }}>
                        {formatDate(r.sessionDate, {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })}
                      </Text>
                      {r.groupName ? (
                        <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
                          {r.groupName}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={{
                        paddingHorizontal: space.md,
                        paddingVertical: 6,
                        borderRadius: radius.pill,
                        backgroundColor: colors[r.status].bg,
                      }}
                    >
                      <Text
                        style={{ color: colors[r.status].fg, fontWeight: "700", fontSize: 12 }}
                      >
                        {tm(r.status)}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}
