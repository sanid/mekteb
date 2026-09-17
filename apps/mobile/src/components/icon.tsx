import {
  BellRing,
  BookMarked,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronRight,
  CheckSquare,
  ClipboardList,
  Clock3,
  Users,
  GraduationCap,
  Home,
  Landmark,
  Megaphone,
  MessageSquare,
  Moon,
  NotebookPen,
  Paperclip,
  Pause,
  Pencil,
  Shield,
  Play,
  Settings,
  Star,
  Trash2,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react-native";

import { usePalette } from "@/theme";

/**
 * One icon vocabulary for the whole app.
 *
 * Screens ask for a *concept* ("announcements", "quran") rather than a glyph,
 * so the drawing for a concept is decided once here instead of drifting between
 * screens — which is exactly what happened while these were emoji, where the
 * same idea showed up as 👥, 👨‍👩‍👧 and ◍ on three different screens.
 *
 * Lucide is the same icon family the web app's hand-drawn SVGs imitate (24px
 * grid, 1.5–2px round stroke), so the two products stay recognisably one.
 */
export const ICONS = {
  home: Home,
  chevron: ChevronRight,
  mosque: Landmark,
  announcements: Megaphone,
  messages: MessageSquare,
  notifications: BellRing,
  settings: Settings,
  students: Users,
  groups: UsersRound,
  children: UsersRound,
  teacher: GraduationCap,
  exams: GraduationCap,
  lessons: BookOpen,
  lessonPage: ClipboardList,
  attachment: Paperclip,
  homework: CheckSquare,
  notes: NotebookPen,
  attendance: CalendarDays,
  calendar: CalendarRange,
  recent: Clock3,
  quran: Moon,
  hifz: BookMarked,
  bookmark: Bookmark,
  bookmarkOn: BookmarkCheck,
  star: Star,
  done: Check,
  remove: X,
  delete: Trash2,
  edit: Pencil,
  shield: Shield,
  play: Play,
  pause: Pause,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/**
 * `color` defaults to the surrounding text colour rather than the accent: an
 * icon sitting next to a label is part of that label, not a highlight.
 */
export function Icon({
  name,
  size = 18,
  color,
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const palette = usePalette();
  const Glyph = ICONS[name];
  return (
    <Glyph size={size} color={color ?? palette.foreground} strokeWidth={strokeWidth} />
  );
}
