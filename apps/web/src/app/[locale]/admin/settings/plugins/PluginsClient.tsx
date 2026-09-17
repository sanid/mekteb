"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { BookMarked, ClipboardCheck, MessageSquare, Megaphone, Bell, Calendar, FileText, Puzzle, BookHeart } from "lucide-react";
import { useTranslations } from "next-intl";
import { togglePlugin } from "./actions";

type Plugin = {
  id: string;
  name: string;
  description: string;
  category: string;
};

type MosquePlugin = {
  plugin_id: string;
  is_active: boolean;
};

const PLUGIN_ICONS: Record<string, React.ReactNode> = {
  lesson_library: <BookMarked className="h-5 w-5" />,
  exam_system: <ClipboardCheck className="h-5 w-5" />,
  messaging: <MessageSquare className="h-5 w-5" />,
  announcements: <Megaphone className="h-5 w-5" />,
  notifications: <Bell className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
  annual_report: <FileText className="h-5 w-5" />,
  quran_hifz: <BookHeart className="h-5 w-5" />,
};

const CATEGORY_ORDER = ["education", "assessment", "communication", "scheduling", "reporting", "integration"];

export function PluginsClient({
  plugins,
  mosquePlugins,
}: {
  plugins: Plugin[];
  mosquePlugins: MosquePlugin[];
}) {
  const t = useTranslations("Admin");
  const [, startTransition] = useTransition();

  const initialState = Object.fromEntries(
    mosquePlugins.map((mp) => [mp.plugin_id, mp.is_active]),
  );
  const [optimisticState, setOptimistic] = useOptimistic(
    initialState,
    (state, { pluginId, active }: { pluginId: string; active: boolean }) => ({
      ...state,
      [pluginId]: active,
    }),
  );

  function handleToggle(pluginId: string, currentActive: boolean) {
    const newActive = !currentActive;
    startTransition(async () => {
      setOptimistic({ pluginId, active: newActive });
      const result = await togglePlugin(pluginId, newActive);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(newActive ? t("pluginActivated") : t("pluginDeactivated"));
      }
    });
  }

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: plugins.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0);

  const categoryLabel = (cat: string) => t(`pluginCategory_${cat}` as Parameters<typeof t>[0], { defaultValue: cat });

  return (
    <div className="space-y-8">
      {byCategory.map(({ category, items }) => (
        <section key={category} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {categoryLabel(category)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((plugin) => {
              const isActive = optimisticState[plugin.id] ?? false;
              return (
                <div
                  key={plugin.id}
                  className={`rounded-xl border p-4 flex items-start gap-4 transition-colors ${
                    isActive
                      ? "border-accent/40 bg-accent-subtle"
                      : "border-card-border bg-card"
                  }`}
                >
                  <div
                    className={`mt-0.5 rounded-lg p-2 shrink-0 ${
                      isActive ? "bg-accent/10 text-accent" : "bg-surface text-muted-foreground"
                    }`}
                  >
                    {PLUGIN_ICONS[plugin.id] ?? <Puzzle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {t(`pluginName_${plugin.id}` as Parameters<typeof t>[0], { defaultValue: plugin.name })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {t(`pluginDesc_${plugin.id}` as Parameters<typeof t>[0], { defaultValue: plugin.description })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle(plugin.id, isActive)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
                          isActive ? "bg-accent" : "bg-card-border"
                        }`}
                        role="switch"
                        aria-checked={isActive}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                            isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    <span
                      className={`mt-2 inline-block text-xs font-medium ${
                        isActive ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      {isActive ? t("pluginActive") : t("pluginInactive")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
