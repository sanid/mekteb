import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View, type ViewStyle } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { AdminGroup, AdminStudentPage, AdminTeacher } from "@/lib/types";
import {
  Avatar,
  Card,
  Chip,
  EmptyState,
  ErrorNotice,
  FirstLoad,
  SectionTitle,
  SegmentedTabs,
} from "@/components/ui";
import { space, radius, usePalette } from "@/theme";
import { Icon } from "@/components/icon";

/**
 * The mobile half of the admin panel: the mosque's directory — students with
 * their linked parents, teachers, and groups with live enrolment counts.
 * Rows open their edit screens; groups open the group editor; the tooling
 * row leads to the audit trail, GDPR queue, enrolment requests and account
 * creation (admin/audit.tsx, admin/gdpr.tsx, admin/enrollment.tsx,
 * admin/create.tsx, admin/group/[id].tsx).
 */
type Tab = "students" | "teachers" | "groups";

const LIMIT = 200;

/** Shared styling for the admin tooling buttons (audit / gdpr / enrolment). */
const toolButton = (palette: ReturnType<typeof usePalette>): ViewStyle => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: space.sm,
  paddingVertical: space.sm,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: palette.cardBorder,
  backgroundColor: palette.surface,
});

const toolLabel = (palette: ReturnType<typeof usePalette>) => ({
  color: palette.foreground,
  fontWeight: "600" as const,
  fontSize: 13,
});

export default function AdminDirectoryScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("students");
  const [query, setQuery] = useState("");

  const students = useResource<AdminStudentPage>(
    "admin/students",
    useCallback(() => api<AdminStudentPage>("/admin/students", { query: { limit: LIMIT } }), []),
    { fallbackError: tm("loadFailed") },
  );
  const teachers = useResource<AdminTeacher[]>(
    "admin/teachers",
    useCallback(() => api<AdminTeacher[]>("/admin/teachers"), []),
    { fallbackError: tm("loadFailed") },
  );
  const groups = useResource<AdminGroup[]>(
    "admin/groups",
    useCallback(() => api<AdminGroup[]>("/admin/groups"), []),
    { fallbackError: tm("loadFailed") },
  );

  const active =
    tab === "students" ? students : tab === "teachers" ? teachers : groups;
  const data = active.data;

  const refresh = () => {
    void Haptics.selectionAsync();
    invalidate("admin/students");
    invalidate("admin/teachers");
    invalidate("admin/groups");
    void students.refresh();
    void teachers.refresh();
    void groups.refresh();
  };

  if (data === null && students.data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("adminDirectory") }} />
        <FirstLoad error={active.error} />
      </>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = (name: string | null | undefined) =>
    q.length === 0 || (name ?? "").toLowerCase().includes(q);

  const filteredStudents =
    students.data?.students.filter((s) => matches(s.full_name)) ?? [];
  const filteredTeachers =
    teachers.data?.filter((t) => {
      const name = t.profiles?.display_name ?? t.profiles?.full_name ?? "";
      return matches(name);
    }) ?? [];
  const filteredGroups =
    groups.data?.filter((g) => matches(g.name)) ?? [];

  const renderStudents = () => {
    if (students.data === null) return <ErrorNotice message={students.error ?? ""} />;
    if (filteredStudents.length === 0) {
      return (
        <EmptyState icon="students">{q ? tm("noResults") : tm("noStudents")}</EmptyState>
      );
    }
    return filteredStudents.map((s) => {
      const parents = students.data?.parentsByStudent[s.id] ?? [];
      return (
        <Card
          key={s.id}
          onPress={() =>
            router.push(
              `/(app)/admin/edit?type=student&id=${s.id}`,
            )
          }
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar name={s.full_name} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 15 }}>
                {s.full_name}
              </Text>
              {parents.length > 0 ? (
                <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
                  {tm("parents")}: {parents.join(", ")}
                </Text>
              ) : null}
            </View>
            {!s.is_active ? (
              <Chip label={tm("inactive")} fg={palette.danger} bg={palette.dangerSubtle} />
            ) : null}
            <Icon name="chevron" size={16} color={palette.faint} />
          </View>
        </Card>
      );
    });
  };

  const renderTeachers = () => {
    if (teachers.data === null) return <ErrorNotice message={teachers.error ?? ""} />;
    if (filteredTeachers.length === 0) {
      return (
        <EmptyState icon="teacher">{q ? tm("noResults") : tm("noTeachers")}</EmptyState>
      );
    }
    return filteredTeachers.map((t) => {
      const name = t.profiles?.display_name ?? t.profiles?.full_name ?? "?";
      return (
        <Card
          key={t.id}
          onPress={() => router.push(`/(app)/admin/edit?type=teacher&id=${t.id}`)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar name={name} size={38} />
            <Text style={{ flex: 1, color: palette.foreground, fontWeight: "600", fontSize: 15 }}>
              {name}
            </Text>
            {!t.is_active ? (
              <Chip label={tm("inactive")} fg={palette.danger} bg={palette.dangerSubtle} />
            ) : null}
            <Icon name="chevron" size={16} color={palette.faint} />
          </View>
        </Card>
      );
    });
  };

  const renderGroups = () => {
    if (groups.data === null) return <ErrorNotice message={groups.error ?? ""} />;
    if (filteredGroups.length === 0) {
      return (
        <EmptyState icon="groups">{q ? tm("noResults") : tm("noGroups")}</EmptyState>
      );
    }
    return filteredGroups.map((g) => (
      <Card
        key={g.id}
        onPress={() => router.push(`/(app)/admin/group/${g.id}`)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 15 }}>
              {g.name}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
              {tm("students")}: {g.student_count} · {tm("teacherCount", { count: g.teacher_count })}
            </Text>
          </View>
          {!g.is_active ? (
            <Chip label={tm("inactive")} fg={palette.danger} bg={palette.dangerSubtle} />
          ) : null}
          <Icon name="chevron" size={16} color={palette.faint} />
        </View>
      </Card>
    ));
  };

  return (
    <>
      <Stack.Screen options={{ title: tm("adminDirectory") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={active.refreshing}
            onRefresh={refresh}
            tintColor={palette.muted}
          />
        }
      >
        <SegmentedTabs<Tab>
          options={[
            { value: "students", label: tm("students") },
            { value: "teachers", label: tm("teachers") },
            { value: "groups", label: tm("groups") },
          ]}
          value={tab}
          onChange={(t) => {
            void Haptics.selectionAsync();
            setTab(t);
          }}
        />

        {/* Admin tooling: audit trail, GDPR queue, enrolment queue and
            account creation (see admin/audit.tsx, admin/gdpr.tsx,
            admin/enrollment.tsx, admin/create.tsx). */}
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                router.push("/(app)/admin/audit");
              }}
              style={toolButton(palette)}
            >
              <Icon name="notes" size={16} color={palette.accent} />
              <Text style={toolLabel(palette)}>{tm("auditLog")}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                router.push("/(app)/admin/gdpr");
              }}
              style={toolButton(palette)}
            >
              <Icon name="shield" size={16} color={palette.accent} />
              <Text style={toolLabel(palette)}>{tm("gdprRequests")}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                router.push("/(app)/admin/enrollment");
              }}
              style={toolButton(palette)}
            >
              <Icon name="homework" size={16} color={palette.accent} />
              <Text style={toolLabel(palette)}>{tm("enrollmentRequests")}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                router.push("/(app)/admin/create");
              }}
              style={toolButton(palette)}
            >
              <Icon name="edit" size={16} color={palette.accent} />
              <Text style={toolLabel(palette)}>{tm("createAccount")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Search filters the already-loaded list locally — the directory is
            bounded (LIMIT 200) and instant filtering beats a round trip. */}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tm("search")}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: palette.cardBorder,
            backgroundColor: palette.surface,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            fontSize: 15,
            color: palette.foreground,
          }}
        />

        {data === null ? (
          <FirstLoad error={active.error} />
        ) : (
          <>
            {active.error ? <ErrorNotice message={active.error} /> : null}
            <SectionTitle
              right={
                tab === "groups" ? (
                  <Pressable
                    onPress={() => {
                      void Haptics.selectionAsync();
                      router.push("/(app)/admin/group/new");
                    }}
                    hitSlop={8}
                  >
                    <Text style={{ color: palette.accent, fontWeight: "700", fontSize: 13 }}>
                      + {tm("newGroup")}
                    </Text>
                  </Pressable>
                ) : undefined
              }
            >
              {tab === "students"
                ? tm("students")
                : tab === "teachers"
                  ? tm("teachers")
                  : tm("groups")}
            </SectionTitle>
            {tab === "students"
              ? renderStudents()
              : tab === "teachers"
                ? renderTeachers()
                : renderGroups()}
            {tab === "students" && students.data ? (
              <Text style={{ color: palette.faint, fontSize: 12, textAlign: "center" }}>
                {students.data.pagination.total !== null
                  ? `${students.data.pagination.total} ${tm("students")}`
                  : ""}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}
