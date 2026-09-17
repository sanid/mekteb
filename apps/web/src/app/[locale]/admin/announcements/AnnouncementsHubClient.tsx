"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Megaphone, Bell } from "lucide-react";
import { AnnouncementListClient } from "./AnnouncementListClient";
import { NotificationItem, type NotificationRow } from "@/components/NotificationItem";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import { listCard, emptyCard } from "@/components/ui/surfaces";

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  is_published: boolean;
  published_at: string | null;
  groups: { name: string } | null;
}

interface Group {
  id: string;
  name: string;
}

export function AnnouncementsHubClient({
  initialTab = "announcements",
  announcements,
  groups,
  notifications,
}: {
  initialTab?: "announcements" | "notifications";
  announcements: Announcement[];
  groups: Group[];
  notifications: NotificationRow[];
}) {
  const t = useTranslations("Admin");
  const tNotif = useTranslations("Notifications");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<"announcements" | "notifications">(initialTab);

  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-card-border pb-0">
        <button
          type="button"
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === "announcements"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Megaphone className="h-4 w-4" />
          <span>{t("announcements")}</span>
          {announcements.length > 0 && (
            <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2 py-0.5 ml-1">
              {announcements.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === "notifications"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>{t("notifications")}</span>
          {unreadNotifCount > 0 ? (
            <span className="rounded-full bg-accent text-accent-foreground text-xs font-semibold px-2 py-0.5 ml-1">
              {unreadNotifCount}
            </span>
          ) : notifications.length > 0 ? (
            <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2 py-0.5 ml-1">
              {notifications.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <AnnouncementListClient initialAnnouncements={announcements} groups={groups} />
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <MarkNotificationsRead />
          {notifications.length === 0 ? (
            <div className={emptyCard}>{tNotif("noNotifications")}</div>
          ) : (
            <ul className={listCard}>
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  messagesHref="/admin/messages"
                  announcementsHref="/admin/announcements"
                  noSubjectLabel={tNotif("noSubject")}
                  locale={locale}
                  t={tNotif}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
