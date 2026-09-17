import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { Button, Card, SectionTitle } from "@/components/ui";
import { radius, space, usePalette } from "@/theme";
import { tm } from "@/lib/i18n";

/**
 * Where a student or parent opens a check-in code: the teacher's screen shows
 * a QR code and a link, and the code itself is the key. Paste the whole link
 * or just the code — both resolve to the session.
 */
export default function CheckinEntryScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [code, setCode] = useState("");

  const open = () => {
    const raw = code.trim();
    if (!raw) return;
    void Haptics.selectionAsync();
    // Accept the full URL the QR encodes, or just the trailing token.
    const token = raw.includes("/") ? raw.split("/").filter(Boolean).pop()! : raw;
    router.push(`/(app)/checkin/${token}`);
  };

  return (
    <>
      <Stack.Screen options={{ title: tm("checkin") }} />
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
          <SectionTitle>{tm("checkin")}</SectionTitle>

          <Card style={{ gap: space.md }}>
            <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
              {tm("checkinCode")}
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder={tm("checkinCodePlaceholder")}
              placeholderTextColor={palette.faint}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: palette.cardBorder,
                backgroundColor: palette.card,
                color: palette.foreground,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
              }}
            />
            <Button
              label={tm("checkinOpen")}
              disabled={!code.trim()}
              onPress={open}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
