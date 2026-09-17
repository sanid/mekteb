import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { Button, Card, SectionTitle } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";
import { tm } from "@/lib/i18n";

/**
 * Where a student opens a written test: they were handed the printed sheet
 * (or the link in an email), and the code on it is the key. Deep links can
 * reach `/(app)/written-test/[token]` directly — this screen is the fallback
 * for everyone who received the code on paper.
 */
export default function WrittenTestEntryScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);

  const open = () => {
    const token = code.trim();
    if (!token) return;
    void Haptics.selectionAsync();
    router.push(`/(app)/written-test/${token}`);
  };

  return (
    <>
      <Stack.Screen options={{ title: tm("writtenTest") }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: space.xl,
            gap: space.lg,
            paddingBottom: insets.bottom + space.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <SectionTitle>{tm("writtenTest")}</SectionTitle>

          <Card style={{ gap: space.md }}>
            <Text
              style={{
                fontSize: 13,
                color: palette.muted,
                fontWeight: "600",
              }}
            >
              {tm("writtenTestCode")}
            </Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\s+/g, ""))}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder="••••••••"
              placeholderTextColor={palette.faint}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={open}
              returnKeyType="go"
              style={{
                borderWidth: 1,
                borderColor: focused ? palette.accent : palette.cardBorder,
                backgroundColor: palette.card,
                color: palette.foreground,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 18,
                fontWeight: "700",
                letterSpacing: 2,
                textAlign: "center",
              }}
            />
            <Text style={{ color: palette.faint, fontSize: 12, lineHeight: 18 }}>
              {tm("writtenTestCodeHint")}
            </Text>
            <Button
              label={tm("openTest")}
              onPress={open}
              disabled={!code.trim()}
              haptic="none"
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
