import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LogOut, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActivePlugins, type PluginId } from "@/lib/plugins";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
import { NavWithBadges } from "@/components/NavWithBadges";
import { PortalSwitcher } from "@/components/PortalSwitcher";
import { MobileNav } from "@/components/MobileNav";
import { SidebarBrand } from "@/components/SidebarBrand";
import AnnouncementBanner from "@/components/AnnouncementBanner";

import { signOut } from "@/app/[locale]/login/actions";

export type PortalRole = "admin" | "teacher" | "parent" | "student" | "examiner";

type NavItem = Parameters<typeof NavWithBadges>[0]["items"][number];

/** A nav entry that is hidden when its plugin is switched off for the mosque. */
export type PortalNavItem = NavItem & { plugin?: PluginId };

export type PortalShellProps = {
  role: PortalRole;
  /** Translation namespace for the shell's own labels (signOut, accountSecurity). */
  namespace: "Admin" | "Teacher" | "Parent" | "Student" | "Examiner";
  /** Already-translated role label shown under the mosque name. */
  roleName: string;
  userId: string;
  mosqueId: string;
  mosqueName: string;
  /** Full nav; entries carrying a `plugin` are filtered against the mosque's active plugins. */
  nav: PortalNavItem[];
  /** Rendered between the brand and the nav — used by admin for the mosque switcher. */
  aboveNav?: ReactNode;
  children: ReactNode;
};

/**
 * The shared chrome for every role portal: sidebar, mobile drawer,
 * announcement banner and footer controls.
 *
 * This previously lived as five near-identical copies that had drifted —
 * only three filtered the nav by active plugin (so student and examiner
 * showed links that bounced straight back to the dashboard), only three
 * parallelised their queries, admin alone lacked the portal switcher, and
 * the account link pointed somewhere different in each. Everything below is
 * now decided once.
 */
export async function PortalShell({
  role,
  namespace,
  roleName,
  userId,
  mosqueId,
  mosqueName,
  nav,
  aboveNav,
  children,
}: PortalShellProps) {
  const t = await getTranslations(namespace);
  const supabase = await createClient();

  const [{ data: branding }, { data: threadRows }, { count: unreadNotifs }, activePlugins] =
    await Promise.all([
      supabase
        .from("mosque_branding")
        .select("logo_url, logo_width, show_text_logo, app_name")
        .eq("mosque_id", mosqueId)
        .maybeSingle(),
      supabase
        .from("message_participants")
        .select("last_read_at, message_threads(updated_at)")
        .eq("profile_id", userId),
      supabase
        .from("notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", userId)
        .eq("is_read", false),
      getActivePlugins(mosqueId),
    ]);

  const unreadMessages = (threadRows ?? []).filter((row) => {
    const thread = row.message_threads as { updated_at: string } | null;
    if (!thread) return false;
    if (!row.last_read_at) return true;
    return new Date(thread.updated_at) > new Date(row.last_read_at);
  }).length;

  const visibleNav = nav.filter((item) => !item.plugin || activePlugins.has(item.plugin));

  const brand = (
    <SidebarBrand
      logoUrl={branding?.logo_url ?? null}
      logoWidth={branding?.logo_width ?? null}
      showTextLogo={branding?.show_text_logo ?? null}
      appName={branding?.app_name ?? null}
      mosqueName={mosqueName}
      roleName={roleName}
    />
  );

  const badgeNav = (
    <NavWithBadges
      items={visibleNav}
      userId={userId}
      initialMessageBadge={unreadMessages}
      initialNotifBadge={unreadNotifs ?? 0}
    />
  );

  const footerControls = (
    <div className="pt-4 border-t border-card-border space-y-1">
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <div className="flex-1">
          <LanguageSwitcher />
        </div>
        <ThemeToggle />
      </div>
      <PortalSwitcher userId={userId} current={role} />
      <NavLink
        href={`/${role}/account`}
        label={t("accountSecurity")}
        icon={<ShieldCheck className="h-4 w-4 shrink-0" />}
      />
      <form action={signOut} className="w-full">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent-subtle hover:text-accent cursor-pointer text-left"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t("signOut")}</span>
        </button>
      </form>
    </div>
  );

  return (
    // `data-portal` scopes the mosque brand colours (see [locale]/layout.tsx).
    <div data-portal className="flex-1 flex">
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-60 flex-col border-r border-card-border bg-surface p-4 h-screen sticky top-0">
        <div className="mb-6">{brand}</div>
        {aboveNav ? <div className="mb-4">{aboveNav}</div> : null}
        <div className="flex-1 overflow-y-auto">{badgeNav}</div>
        {footerControls}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with drawer */}
        <header className="sm:hidden sticky top-0 z-10 flex items-center justify-between border-b border-card-border bg-background/80 backdrop-blur-md px-3 py-2">
          <div className="flex items-center gap-1 min-w-0">
            <MobileNav brand={brand}>
              {badgeNav}
              <div className="mt-4">{footerControls}</div>
            </MobileNav>
            <div className="font-semibold text-sm truncate">{mosqueName}</div>
          </div>
          <ThemeToggle />
        </header>

        <AnnouncementBanner mosqueId={mosqueId} />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
