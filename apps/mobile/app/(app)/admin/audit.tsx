import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { AuditLogEntry } from "@/lib/types";
import { Card, EmptyState, ErrorNotice, FirstLoad, SectionTitle } from "@/components/ui";
import { space, usePalette } from "@/theme";

type AuditPage = {
  logs: AuditLogEntry[];
  page: number;
  totalPages: number;
  total: number;
  actors: Record<string, string | null>;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Short, friendly label for an audit action id. */
function actionLabel(action: string): string {
  const known: Record<string, string> = {
    "student.updated": "student.updated",
    "student.deactivated": "student.deactivated",
    "student.account_erased": "student.account_erased",
    "teacher.account_erased": "teacher.account_erased",
    "homework.created": "homework.created",
    "announcement.created": "announcement.created",
    "enrollment.approved": "enrollment.approved",
    "device_token.deleted": "device_token.deleted",
  };
  return known[action] ?? action;
}

/**
 * The mosque's audit trail — who did what, when. Read-only; mirrors the web
 * `/admin/audit` page, paginated 50 per page.
 */
export default function AdminAuditScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);

  const { data, error, refreshing, refresh } = useResource<AuditPage>(
    `admin/audit?page=${page}`,
    useCallback(() => api<AuditPage>(`/admin/audit?page=${page}`), [page]),
    { fallbackError: tm("loadFailed") },
  );

  if (data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("auditLog") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const hasPrev = page > 1;
  const hasNext = page < data.totalPages;

  return (
    <>
      <Stack.Screen options={{ title: tm("auditLog") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{
          padding: space.xl,
          gap: space.md,
          paddingBottom: insets.bottom + space.xxl,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />
        }
      >
        <Text style={{ color: palette.muted, fontSize: 12 }}>
          {tm("totalCount", { count: data.total })}
        </Text>

        {data.logs.length === 0 ? (
          <EmptyState icon="notes">{tm("noAuditEntries")}</EmptyState>
        ) : (
          data.logs.map((log) => {
            const actor = log.actor_user_id ? data.actors[log.actor_user_id] : null;
            return (
              <Card key={log.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
                  <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 14, flex: 1 }}>
                    {actionLabel(log.action)}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>{formatDateTime(log.created_at)}</Text>
                </View>
                <Text style={{ color: palette.muted, fontSize: 12 }}>
                  {actor ?? "—"}
                  {log.target_table ? ` · ${log.target_table}` : ""}
                </Text>
              </Card>
            );
          })
        )}

        {(hasPrev || hasNext) && data.totalPages > 1 ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space.sm }}>
            <Pressable
              disabled={!hasPrev}
              onPress={() => setPage((p) => p - 1)}
              style={{ opacity: hasPrev ? 1 : 0.4 }}
            >
              <Text style={{ color: palette.accent, fontWeight: "600", fontSize: 14 }}>
                {tm("prevPage")}
              </Text>
            </Pressable>
            <Text style={{ color: palette.muted, fontSize: 13 }}>
              {page} / {data.totalPages}
            </Text>
            <Pressable
              disabled={!hasNext}
              onPress={() => setPage((p) => p + 1)}
              style={{ opacity: hasNext ? 1 : 0.4 }}
            >
              <Text style={{ color: palette.accent, fontWeight: "600", fontSize: 14 }}>
                {tm("nextPage")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
