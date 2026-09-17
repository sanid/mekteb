"use client";

import { useLocale } from "next-intl";

import { Link } from "@/i18n/routing";

/**
 * Link inside the public library. On a library subdomain (base === "") the
 * proxy rewrites every path, which the client router can't follow, so those
 * links do a normal page load instead.
 */
export function LibraryLink({
  base,
  href,
  ...props
}: { base: string; href: string } & Omit<React.ComponentProps<"a">, "href">) {
  const locale = useLocale();
  if (base === "") return <a href={`/${locale}${href === "/" ? "" : href}`} {...props} />;
  return <Link href={href} {...props} />;
}
