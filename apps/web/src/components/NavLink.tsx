"use client";

import { usePathname } from "next/navigation";

import { Link } from "@/i18n/routing";

export function NavLink({
  href,
  label,
  icon,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  const pathname = usePathname();
  // Strip locale prefix so "/de/admin/groups/123" → "/admin/groups/123"
  const pathWithoutLocale = "/" + pathname.split("/").slice(2).join("/");
  // Overview pages (1 segment: /admin, /teacher, /parent) use exact match only
  const isTopLevel = href.split("/").filter(Boolean).length === 1;
  const isActive = isTopLevel
    ? pathWithoutLocale === href
    : pathWithoutLocale === href || pathWithoutLocale.startsWith(href + "/");

  return (
    <Link
      href={href}
      prefetch={true}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-accent-subtle text-accent font-medium"
          : "hover:bg-accent-subtle hover:text-accent"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge > 0 ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
