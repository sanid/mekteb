import { getTranslations } from "next-intl/server";
import { LayoutDashboard, Building2, CreditCard, Shield, LogOut } from "lucide-react";

import { requirePlatformOwner } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { MobileNav } from "@/components/MobileNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

import { signOut } from "../login/actions";

/**
 * The platform-owner portal deliberately does not use `PortalShell`: it is
 * cross-tenant, so it has no mosque branding, no announcement banner, no
 * plugin gating and no portal switcher. It shares the shell's *structure*
 * (sidebar + mobile drawer + footer controls) so it does not feel like a
 * different product.
 */
export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformOwner();
  const t = await getTranslations("PlatformAdmin");

  const nav = [
    { href: "/platform-admin", label: t("overview"), icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
    { href: "/platform-admin/mosques", label: t("mosques"), icon: <Building2 className="h-4 w-4 shrink-0" /> },
    { href: "/platform-admin/billing", label: t("billing"), icon: <CreditCard className="h-4 w-4 shrink-0" /> },
    { href: "/platform-admin/gdpr", label: t("gdprLog"), icon: <Shield className="h-4 w-4 shrink-0" /> },
  ];

  const brand = (
    <div className="px-1">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider">{t("platformAdmin")}</p>
      <p className="text-sm font-semibold mt-0.5">Mekteb</p>
    </div>
  );

  const navList = (
    <nav className="space-y-1">
      {nav.map((item) => (
        <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
      ))}
    </nav>
  );

  const footerControls = (
    <div className="pt-4 border-t border-card-border space-y-1">
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <div className="flex-1">
          <LanguageSwitcher />
        </div>
        <ThemeToggle />
      </div>
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
    <div className="flex-1 flex">
      <aside className="hidden sm:flex w-60 flex-col border-r border-card-border bg-surface p-4 h-screen sticky top-0">
        <div className="mb-6">{brand}</div>
        <div className="flex-1 overflow-y-auto">{navList}</div>
        {footerControls}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sm:hidden sticky top-0 z-10 flex items-center justify-between border-b border-card-border bg-background/80 backdrop-blur-md px-3 py-2">
          <div className="flex items-center gap-1 min-w-0">
            <MobileNav brand={brand}>
              {navList}
              <div className="mt-4">{footerControls}</div>
            </MobileNav>
            <div className="font-semibold text-sm truncate">{t("platformAdmin")}</div>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
