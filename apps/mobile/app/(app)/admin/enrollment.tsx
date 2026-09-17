import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { EnrollmentRequest, EnrollmentRequestsPage } from "@/lib/types";
import { Button, Card, Chip, EmptyState, ErrorNotice, FirstLoad, SegmentedTabs } from "@/components/ui";
import { space, usePalette } from "@/theme";

type Filter = "all" | "pending";

function statusLabel(status: EnrollmentRequest["status"]): string {
  return status === "pending"
    ? tm("enrollmentPending")
    : status === "approved"
      ? tm("enrollmentApproved")
      : tm("enrollmentRejected");
}

/**
 * The admin's enrolment-request queue — the mobile half of `/admin/enrollment`.
 * Approve/reject are status-only, exactly like the web: no account is
 * provisioned from an approved request.
 */
export default function AdminEnrollmentScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, error, refreshing, refresh } = useResource<EnrollmentRequestsPage>(
    `admin/enrollment-requests?filter=${filter}`,
    useCallback(
      () =>
        api<EnrollmentRequestsPage>("/admin/enrollment-requests", {
          query: { status: filter === "pending" ? "pending" : undefined },
        }),
      [filter],
    ),
    { fallbackError: tm("loadFailed") },
  );

  const act = async (request: EnrollmentRequest, action: "approve" | "reject" | "delete") => {
    setBusyId(request.id);
    void Haptics.selectionAsync();
    try {
      await api(`/admin/enrollment-requests/${request.id}`, { method: "POST", body: { action } });
      invalidate("admin/enrollment-requests");
      invalidate("admin/audit");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void refresh();
    } catch (e) {
      Alert.alert(tm("enrollmentActionFailed"), e instanceof Error ? e.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (request: EnrollmentRequest) => {
    Alert.alert(tm("delete"), tm("enrollmentDeleteConfirm"), [
      { text: tm("cancel"), style: "cancel" },
      { text: tm("delete"), style: "destructive", onPress: () => void act(request, "delete") },
    ]);
  };

  if (data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("enrollmentRequests") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const requests = data.requests;

  return (
    <>
      <Stack.Screen options={{ title: tm("enrollmentRequests") }} />
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
        <SegmentedTabs<Filter>
          options={[
            { value: "all", label: tm("enrollmentFilterAll") },
            { value: "pending", label: tm("enrollmentFilterPending") },
          ]}
          value={filter}
          onChange={setFilter}
        />

        {data.pendingCount > 0 ? (
          <Text style={{ color: palette.muted, fontSize: 12 }}>
            {tm("totalCount", { count: data.pendingCount })}
          </Text>
        ) : null}

        {error ? <ErrorNotice message={error} /> : null}

        {requests.length === 0 ? (
          <EmptyState icon="notes">{tm("enrollmentEmpty")}</EmptyState>
        ) : (
          requests.map((r) => (
            <Card key={r.id} style={{ gap: space.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
                <Text style={{ flex: 1, color: palette.foreground, fontWeight: "700", fontSize: 15 }}>
                  {r.child_name}
                </Text>
                <Chip
                  label={statusLabel(r.status)}
                  fg={
                    r.status === "approved"
                      ? palette.accent
                      : r.status === "rejected"
                        ? palette.danger
                        : palette.muted
                  }
                  bg={r.status === "rejected" ? palette.dangerSubtle : palette.surface}
                />
              </View>
              <Text style={{ color: palette.muted, fontSize: 13 }}>
                {tm("enrollmentChild")}: {r.child_name}
                {r.child_birth_year ? ` · ${tm("enrollmentBorn")} ${r.child_birth_year}` : ""}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 13 }}>
                {tm("enrollmentParent")}: {r.parent_name} · {r.parent_email}
                {r.parent_phone ? ` · ${r.parent_phone}` : ""}
              </Text>
              {r.message ? (
                <Text style={{ color: palette.muted, fontSize: 13, fontStyle: "italic" }}>
                  {r.message}
                </Text>
              ) : null}
              <Text style={{ color: palette.faint, fontSize: 12 }}>{formatDate(r.created_at, { day: "numeric", month: "short", year: "numeric" })}</Text>

              {r.status === "pending" ? (
                <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.xs }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={tm("enrollmentApprove")}
                      busy={busyId === r.id}
                      onPress={() => void act(r, "approve")}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={tm("enrollmentReject")}
                      variant="outline"
                      busy={busyId === r.id}
                      onPress={() => void act(r, "reject")}
                    />
                  </View>
                </View>
              ) : null}

              {r.status === "pending" ? (
                <Pressable
                  onPress={() => confirmDelete(r)}
                  hitSlop={6}
                  style={{ alignSelf: "flex-end" }}
                >
                  <Text style={{ color: palette.danger, fontSize: 13, fontWeight: "600" }}>
                    {tm("delete")}
                  </Text>
                </Pressable>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}
