import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { invalidate, useResource } from "@/lib/resource";
import { getLocale, tm } from "@/lib/i18n";
import type { ExaminerQuestionBank } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Field,
  FirstLoad,
  SectionTitle,
} from "@/components/ui";
import { space, usePalette } from "@/theme";
import { Icon } from "@/components/icon";

/**
 * Build an online written test for one exam session: give it a title, filter
 * the question bank by topic, tick the questions, create. The server re-checks
 * the session and fans out the token to the student and their parents — this
 * is the mobile half of the web test builder (`examiner/tests/new`).
 */
export default function ExaminerCreateTestScreen() {
  const { sessionId, studentName } = useLocalSearchParams<{
    sessionId: string;
    studentName?: string;
  }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, error: loadError } = useResource<ExaminerQuestionBank>(
    sessionId ? "examiner/questions" : null,
    useCallback(
      () => api<ExaminerQuestionBank>("/examiner/questions", { query: { locale: getLocale() } }),
      [],
    ),
    { fallbackError: tm("questionBankLoadFailed") },
  );

  const toggle = (id: string) => {
    void Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const create = async () => {
    if (!data || selected.size === 0 || creating) return;
    setCreating(true);
    setError(null);
    void Haptics.selectionAsync();
    try {
      await api("/written-tests", {
        method: "POST",
        body: {
          exam_session_id: sessionId,
          title: title.trim() || tm("writtenTestDefaultTitle"),
          question_ids: [...selected],
        },
      });
      invalidate("exams");
      invalidate("written-tests");
      invalidate("home");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(tm("testCreated"), tm("testCreatedBody"), [
        { text: tm("ok"), onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : tm("testCreateFailed"));
      setCreating(false);
    }
  };

  if (data === null) {
    return (
      <>
        <Stack.Screen options={{ title: tm("newTest") }} />
        <FirstLoad error={loadError} />
      </>
    );
  }

  const topics = data.topics;
  const filtered =
    topic === "all"
      ? data.questions
      : data.questions.filter((q) => q.topic_id === topic);
  const topicName = (id: string | null) =>
    id ? topics.find((t) => t.id === id)?.title ?? "?" : null;

  return (
    <>
      <Stack.Screen options={{ title: tm("newTest") }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: space.xl,
            gap: space.md,
            paddingBottom: insets.bottom + space.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {studentName ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Avatar name={studentName} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 15 }}>
                  {studentName}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 12 }}>
                  {tm("newTestForSession")}
                </Text>
              </View>
            </View>
          ) : null}

          <Card style={{ gap: space.md }}>
            <Field
              label={tm("testTitle")}
              value={title}
              onChangeText={setTitle}
              placeholder={tm("writtenTestDefaultTitle")}
            />

            <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
              {tm("filterByTopic")}
            </Text>
            {topics.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[{ id: "all", title: tm("allTopics") }, ...topics].map((t) => {
                    const active = t.id === topic;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setTopic(t.id);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          borderWidth: 1.5,
                          borderColor: active ? palette.accent : palette.cardBorder,
                          backgroundColor: active ? palette.accentSubtle : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: active ? "800" : "600",
                            color: active ? palette.accent : palette.muted,
                          }}
                        >
                          {t.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
          </Card>

          {loadError ? <ErrorNotice message={loadError} /> : null}
          {error ? <ErrorNotice message={error} /> : null}

          <SectionTitle right={<Text style={{ color: palette.faint, fontSize: 12 }}>
            {selected.size} / {filtered.length}
          </Text>}>
            {tm("questions")}
          </SectionTitle>

          {data.questions.length === 0 ? (
            <EmptyState icon="lessonPage">{tm("questionBankEmpty")}</EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState icon="lessonPage">{tm("noResults")}</EmptyState>
          ) : (
            filtered.map((q) => {
              const isOn = selected.has(q.id);
              const tname = topicName(q.topic_id);
              return (
                <Card key={q.id} onPress={() => toggle(q.id)} style={{ padding: space.md }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.foreground, fontWeight: "600", fontSize: 14 }}>
                        {q.question_text}
                      </Text>
                      {tname ? (
                        <Text style={{ color: palette.faint, fontSize: 12, marginTop: 2 }}>
                          {tname}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isOn ? palette.accent : palette.cardBorder,
                        backgroundColor: isOn ? palette.accent : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isOn ? <Icon name="done" size={14} color={palette.onAccent} /> : null}
                    </View>
                  </View>
                </Card>
              );
            })
          )}

          <Button
            label={tm("createTest")}
            busy={creating}
            disabled={selected.size === 0}
            onPress={create}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
