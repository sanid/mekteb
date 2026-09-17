import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { GdprRequest } from "@/lib/types";
import { Card, Chip, EmptyState, ErrorNotice, FirstLoad, SegmentedTabs } from "@/components/ui";
import { space, usePalette } from "@/theme";

type StatusFilter = "" | "pending" | "processing" | "sent" | "completed" | "rejected" | "failed";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABEL: Record<string, string> = {
  pending: "pending",
  processing: "processing",
  sent: "sent",
  completed: "completed",
  rejected: "rejected",
  failed: "failed",
};

/**
 * GDPR export / deletion requests for the mosque. Read-only on mobile — the
 * execution flows (export email, erase account) stay on web for now, so an
 * admin can monitor the queue from the phone.
 */
export default function AdminGdprScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<StatusFilter>("");

  const { data, error, refreshing, refresh } = useResource<{ requests: GdprRequest[] }>(
    `admin/gdpr-requests?limit=100${status ? `&status=${status}` : ""}`,
    useCallback(
      () => api<{ requests: GdprRequest[] }>(`/admin/gdpr-requests?limit=100${status ? `&status=${status}` : ""}`),
      [status],
    ),
    { fallbackError: tm("loadFailed") },
  );

  if (data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("gdprRequests") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const requests = data.requests ?? [];

  return (
    <>
      <Stack.Screen options={{ title: tm("gdprRequests") }} />
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
        <SegmentedTabs<StatusFilter>
          options={[
            { value: "", label: tm("gdprAll") },
            { value: "pending", label: tm("gdprPending") },
            { value: "completed", label: tm("gdprCompleted") },
          ]}
          value={status}
          onChange={setStatus}
        />

        {error ? <ErrorNotice message={error} /> : null}

        {requests.length === 0 ? (
          <EmptyState icon="notifications">{tm("noGdprRequests")}</EmptyState>
        ) : (
          requests.map((r) => (
            <Card key={r.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
                <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 14, flex: 1 }}>
                  {r.email}
                </Text>
                <Chip
                  label={r.type === "export" ? tm("gdprExport") : tm("gdprDeletion")}
                  fg={palette.accent}
                  bg={palette.accentSubtle}
                />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: palette.muted, fontSize: 12 }}>
                  {formatDateTime(r.requested_at)}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 12 }}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}
