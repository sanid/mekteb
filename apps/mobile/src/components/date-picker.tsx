import { Modal, Pressable, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDate, tm } from "@/lib/i18n";
import { radius, space, usePalette } from "@/theme";

/**
 * A list of the next six weeks, rather than a native date picker.
 *
 * `@react-native-community/datetimepicker` would be another native module for
 * one control, and every native dependency added here forces a rebuild of
 * everyone's dev client (AGENTS.md §10). A scrolling list of real dates also
 * reads better than a spinner for "some day in the next few weeks".
 *
 * Shared by the student/parent exam counter-proposal and the examiner's
 * scheduling (propose, counter, retake) so both sides pick from the same
 * window and format.
 */

/** Dates a picker may offer: tomorrow through the window. */
export function candidateDates(windowDays = 42): string[] {
  const out: string[] = [];
  for (let i = 1; i <= windowDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    // Local calendar parts, not `toISOString()` — that shifts to UTC and hands
    // the server yesterday for anyone east of Greenwich in the evening.
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
    );
  }
  return out;
}

export function DatePickerSheet({
  open,
  onClose,
  onPick,
  title,
  windowDays = 42,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (date: string) => void;
  title?: string;
  windowDays?: number;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tm("cancel")}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(28,36,32,0.4)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            maxHeight: "70%",
            backgroundColor: palette.background,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingTop: space.lg,
            paddingHorizontal: space.xl,
            paddingBottom: insets.bottom + space.lg,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: palette.foreground,
              marginBottom: space.md,
            }}
          >
            {title ?? tm("examPickDate")}
          </Text>
          <ScrollView>
            {candidateDates(windowDays).map((date) => (
              <Pressable
                key={date}
                accessibilityRole="button"
                onPress={() => onPick(date)}
                style={({ pressed }) => ({
                  paddingVertical: space.md,
                  borderBottomWidth: 1,
                  borderBottomColor: palette.cardBorder,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ fontSize: 15, color: palette.foreground }}>
                  {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
