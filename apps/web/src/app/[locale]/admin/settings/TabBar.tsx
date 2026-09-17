"use client";

import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";

export type TabId = "general" | "billing" | "plugins" | "categories" | "diplomas" | "devices";

const TABS: { id: TabId; label: string }[] = [
  { id: "general",    label: "General" },
  { id: "billing",    label: "Billing" },
  { id: "plugins",    label: "Plugins" },
  { id: "categories", label: "Categories" },
  { id: "diplomas",   label: "Diplomas" },
  { id: "devices",    label: "Devices" },
];

export function TabBar({ labels }: { labels: Record<TabId, string> }) {
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") ?? "general") as TabId;

  return (
    <div className="flex gap-1 border-b border-card-border">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/admin/settings?tab=${tab.id}`}
          className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === tab.id
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-card-border"
          }`}
        >
          {labels[tab.id]}
        </Link>
      ))}
    </div>
  );
}
