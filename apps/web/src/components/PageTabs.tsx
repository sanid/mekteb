import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type PageTab = { key: string; label: string; count?: number | null };

/**
 * URL-driven tab bar for detail pages (`?tab=`). The first tab is the default
 * and gets the clean URL, so links to the page land on it. Server-rendered —
 * each tab is a real link, which keeps back/refresh/share working.
 */
export function PageTabs({
  tabs,
  active,
  basePath,
  label,
}: {
  tabs: PageTab[];
  active: string;
  basePath: string;
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="sticky top-0 z-10 flex gap-0.5 overflow-x-auto no-scrollbar rounded-xl bg-surface p-1 whitespace-nowrap"
    >
      {tabs.map((tab, i) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={i === 0 ? basePath : `${basePath}?tab=${tab.key}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
              isActive ? "bg-card text-foreground shadow-elevated" : "text-muted hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] font-semibold tabular-nums leading-[18px]",
                  isActive ? "bg-accent-subtle text-accent" : "bg-card-border/70 text-muted",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function resolveTab(tabs: PageTab[], requested: string | undefined): string {
  return tabs.some((t) => t.key === requested) ? requested! : tabs[0].key;
}
