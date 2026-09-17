import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { api, ApiError } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { tm } from "@/lib/i18n";
import type { WrittenTestDetail } from "@/lib/types";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorNotice,
  Field,
  FirstLoad,
} from "@/components/ui";
import { space, usePalette } from "@/theme";

/**
 * The written test itself, opened by token (deep link or the entry screen).
 *
 * Three states mirror the web page at `/test/[token]`: answer the questions
 * (pending), a confirmation once submitted, and the graded result with the
 * examiner's comments after. Answers are only ever filed once — the server
 * rejects a second submit.
 */
export default function WrittenTestScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Optimistic flip after a successful submit, so the confirmation shows
      before the refetch round-trips. */
  const [justSubmitted, setJustSubmitted] = useState(false);

  const { data, error, set } = useResource<WrittenTestDetail>(
    token ? `written-test/${token}` : null,
    useCallback(() => api<WrittenTestDetail>(`/written-tests/${token}`), [token]),
    { fallbackError: tm("testLoadFailed") },
  );

  const submit = async () => {
    if (!data || data.status !== "pending" || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api(`/written-tests/${token}/submit`, {
        method: "POST",
        body: {
          answers: data.questions.map((q) => ({
            question_id: q.id,
            question_order: q.order,
            answer_text: answers[q.id] ?? "",
          })),
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJustSubmitted(true);
      set(await api<WrittenTestDetail>(`/written-tests/${token}`));
      // The examiner's inbox should drop the "ready to grade" queue the moment
      // it exists.
      invalidate("examiner");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitError(e instanceof ApiError ? e.message : tm("testSubmitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: tm("writtenTest") }} />
        <FirstLoad error={error} />
      </>
    );
  }

  const { status } = data;

  return (
    <>
      <Stack.Screen options={{ title: data.title || tm("writtenTest") }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={{
            padding: space.xl,
            gap: space.lg,
            paddingBottom: insets.bottom + space.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <ErrorNotice message={error} /> : null}
          {submitError ? <ErrorNotice message={submitError} /> : null}

          {data.mosqueName ? (
            <Text style={{ color: palette.faint, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
              {data.mosqueName.toUpperCase()}
            </Text>
          ) : null}
          <Text style={{ fontSize: 24, fontWeight: "700", color: palette.foreground }}>
            {data.title}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            {tm("student")} <Text style={{ fontWeight: "700", color: palette.foreground }}>{data.studentName}</Text>
          </Text>

          {status === "pending" ? (
            <>
              <Text style={{ color: palette.muted, fontSize: 13 }}>
                {tm("questionsHint", { count: data.questions.length })}
              </Text>
              {data.questions.map((q, i) => (
                <Animated.View
                  key={q.id}
                  entering={FadeInDown.delay(Math.min(i * 30, 240)).duration(200)}
                >
                  <View style={{ gap: 6 }}>
                    <Text
                      style={{ color: palette.foreground, fontWeight: "600", fontSize: 15 }}
                    >
                      {i + 1}. {q.question_text}
                    </Text>
                    <Field
                      label=""
                      value={answers[q.id] ?? ""}
                      onChangeText={(t) => setAnswers((prev) => ({ ...prev, [q.id]: t }))}
                      placeholder={tm("yourAnswer")}
                      multiline
                    />
                  </View>
                </Animated.View>
              ))}
              <Button
                label={submitting ? tm("submitting") : tm("submitTest")}
                onPress={submit}
                busy={submitting}
                haptic="none"
              />
            </>
          ) : null}

          {status === "submitted" || justSubmitted ? (
            <Card style={{ alignItems: "center", gap: space.sm, paddingVertical: space.xl }}>
              <Text style={{ fontSize: 32 }}>✓</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: palette.foreground }}>
                {tm("submitted")}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 13, textAlign: "center" }}>
                {tm("savedExaminerWillGrade")}
              </Text>
            </Card>
          ) : null}

          {status === "graded" ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 15 }}>
                  {tm("result")}
                </Text>
                <Chip
                  label={data.overallResult === "passed" ? tm("examPassed") : tm("examFailed")}
                  fg={data.overallResult === "passed" ? palette.accent : palette.danger}
                  bg={data.overallResult === "passed" ? palette.accentSubtle : palette.dangerSubtle}
                />
              </View>
              {data.examinerNote ? (
                <Text style={{ color: palette.muted, fontSize: 14, fontStyle: "italic" }}>
                  {data.examinerNote}
                </Text>
              ) : null}
              <View style={{ gap: space.md }}>
                {data.answers.map((a, i) => (
                  <Card key={i} style={{ gap: 6 }}>
                    <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 15 }}>
                      {a.order}. {a.questionText}
                    </Text>
                    <Text style={{ color: palette.muted, fontSize: 14 }}>
                      {a.answerText || <Text style={{ fontStyle: "italic" }}>{tm("noAnswerGiven")}</Text>}
                    </Text>
                    {a.examinerComment ? (
                      <Text
                        style={{
                          color: palette.accent,
                          fontSize: 13,
                          marginTop: 4,
                          backgroundColor: palette.accentSubtle,
                          padding: space.sm,
                          borderRadius: 8,
                        }}
                      >
                        {tm("examinerComment")}: {a.examinerComment}
                      </Text>
                    ) : null}
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {status === "pending" && data.questions.length === 0 ? (
            <EmptyState icon="lessonPage">{tm("noQuestions")}</EmptyState>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
