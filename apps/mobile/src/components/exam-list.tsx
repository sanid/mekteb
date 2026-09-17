import { useState } from "react";
import { Alert, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api, ApiError } from "@/lib/api";
import { invalidate } from "@/lib/resource";
import { formatDate, tm } from "@/lib/i18n";
import type { StudentExamSession } from "@/lib/types";
import { Button, Card, EmptyState, ErrorNotice, SectionTitle } from "@/components/ui";
import { radius, space, usePalette, type Palette } from "@/theme";
import { DatePickerSheet } from "@/components/date-picker";

/**
 * Exams, and the three answers the student side is allowed to give: accept the
 * proposed date, propose another, or call the exam off.
 *
 * Shared by the student's own exam screen and the parent's child screen —
 * `POST /exams/[id]/respond` accepts either, and the rules live in the database
 * functions behind it, so both surfaces behave identically by construction.
 */
const UPCOMING = new Set(["proposed", "scheduled", "in_progress"]);


export function statusLabel(status: string): string {
  switch (status) {
    case "proposed":
      return tm("examProposed");
    case "scheduled":
      return tm("examScheduled");
    case "in_progress":
      return tm("examInProgress");
    case "passed":
      return tm("examPassed");
    case "failed":
      return tm("examFailed");
    case "cancelled":
      return tm("examCancelled");
    default:
      return status;
  }
}

/** Result reads by colour: passed is the only green, failed the only red. */
function statusColors(status: string, p: Palette): { fg: string; bg: string } {
  switch (status) {
    case "passed":
      return { fg: p.accent, bg: p.accentSubtle };
    case "failed":
      return { fg: p.danger, bg: p.dangerSubtle };
    case "cancelled":
      return { fg: p.muted, bg: p.surface };
    case "in_progress":
      return { fg: p.warning, bg: p.warningSubtle };
    default:
      return { fg: p.info, bg: p.infoSubtle };
  }
}

/**
 * Whether the ball is in this side's court.
 *
 * A date the *student or parent* proposed is waiting on the examiner — offering
 * "accept" there would let them confirm their own proposal, which the examiner
 * never agreed to.
 */
function awaitingResponse(session: StudentExamSession): boolean {
  if (!UPCOMING.has(session.status) || session.status === "in_progress") return false;
  if (session.schedule_status === "confirmed") return false;
  return session.proposed_by === "examiner";
}

export function ExamList({
  sessions,
  /** Cache keys to drop after a change, so the other screens agree. */
  invalidateKeys,
  onChanged,
}: {
  sessions: StudentExamSession[];
  invalidateKeys: string[];
  onChanged: () => Promise<void> | void;
}) {
  const palette = usePalette();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [counterFor, setCounterFor] = useState<string | null>(null);

  const respond = async (
    sessionId: string,
    action: "accept" | "counter" | "cancel",
    counterDate?: string,
  ) => {
    if (busyId) return;
    setBusyId(sessionId);
    setActionError(null);
    try {
      await api(`/exams/${sessionId}/respond`, {
        method: "POST",
        body: { action, ...(counterDate ? { counterDate } : {}) },
      });
      for (const key of invalidateKeys) invalidate(key);
      await onChanged();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : tm("examActionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = (sessionId: string) => {
    // Calling off an exam is not undoable from here — the examiner has to
    // propose a new one — so it asks first.
    Alert.alert(tm("examCancel"), tm("examCancelConfirm"), [
      { text: tm("cancel"), style: "cancel" },
      {
        text: tm("confirm"),
        style: "destructive",
        onPress: () => void respond(sessionId, "cancel"),
      },
    ]);
  };

  const upcoming = sessions.filter((s) => UPCOMING.has(s.status));
  const past = sessions.filter((s) => !UPCOMING.has(s.status));

  const renderItem = (session: StudentExamSession) => {
    const colors = statusColors(session.status, palette);
    const mine = awaitingResponse(session);
    const waitingOnThem =
      UPCOMING.has(session.status) &&
      session.schedule_status === "counter_proposed" &&
      !mine;
    const busy = busyId === session.id;

    return (
      <Card key={session.id}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 15 }}>
              {session.exam_date
                ? formatDate(session.exam_date, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : tm("examDateTbd")}
            </Text>

            {/* While a date is still being agreed, the proposal is the news —
                `exam_date` is only set once someone accepts. */}
            {mine && session.proposed_date ? (
              <Text style={{ color: palette.info, fontSize: 13, marginTop: 4 }}>
                {tm("examProposedFor")}:{" "}
                {formatDate(session.proposed_date, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            ) : null}

            {session.summary ? (
              <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
                {session.summary}
              </Text>
            ) : null}

            {waitingOnThem ? (
              <Text
                style={{
                  color: palette.warning,
                  fontSize: 12,
                  marginTop: 6,
                  fontWeight: "600",
                }}
              >
                {tm("examAwaitingConfirmation")}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              paddingHorizontal: space.md,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: colors.bg,
            }}
          >
            <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 12 }}>
              {statusLabel(session.status)}
            </Text>
          </View>
        </View>

        {mine ? (
          <View style={{ gap: space.sm, marginTop: space.md }}>
            <Button
              label={tm("examAccept")}
              haptic="success"
              busy={busy}
              onPress={() => void respond(session.id, "accept")}
            />
            <Button
              label={tm("examCounter")}
              variant="outline"
              disabled={busy}
              onPress={() => setCounterFor(session.id)}
            />
          </View>
        ) : null}

        {UPCOMING.has(session.status) && session.status !== "in_progress" ? (
          <Button
            label={tm("examCancel")}
            variant="ghost"
            haptic="none"
            disabled={busy}
            onPress={() => confirmCancel(session.id)}
            style={{ marginTop: mine ? 0 : space.md }}
          />
        ) : null}
      </Card>
    );
  };

  return (
    <>
      {actionError ? <ErrorNotice message={actionError} /> : null}

      {sessions.length === 0 ? (
        <EmptyState icon="exams">{tm("noExams")}</EmptyState>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <>
              <SectionTitle>{tm("upcomingExams")}</SectionTitle>
              {upcoming.map((s, i) => (
                <Animated.View key={s.id} entering={FadeInDown.delay(i * 40).duration(220)}>
                  {renderItem(s)}
                </Animated.View>
              ))}
            </>
          ) : null}

          {past.length > 0 ? (
            <View style={{ gap: space.md, marginTop: upcoming.length ? space.md : 0 }}>
              <SectionTitle>{tm("pastExams")}</SectionTitle>
              {past.map(renderItem)}
            </View>
          ) : null}
        </>
      )}

      <DatePickerSheet
        open={counterFor !== null}
        onClose={() => setCounterFor(null)}
        onPick={(date) => {
          const id = counterFor;
          setCounterFor(null);
          if (id) void respond(id, "counter", date);
        }}
      />
    </>
  );
}
