import { ArrowLeftRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NavLink } from "@/components/NavLink";
import { createClient } from "@/lib/supabase/server";

type CurrentPortal = "admin" | "teacher" | "examiner" | "parent" | "student";

/**
 * Renders "Switch to X" NavLinks for every other portal the signed-in user
 * has access to, one per alternate role. All roles are membership-based.
 *
 * The admin link matters as much as the rest: a user holding both
 * `mosque_admin` and `teacher` previously had no way back to /admin from the
 * teacher portal, because this only ever offered the non-admin portals.
 */
export async function PortalSwitcher({
  userId,
  current,
}: {
  userId: string;
  current: CurrentPortal;
}) {
  const supabase = await createClient();
  const t = await getTranslations("Portal");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true);

  const roles = new Set((memberships ?? []).map((m) => m.role));

  const links: Array<{ href: string; label: string }> = [];
  if (current !== "admin" && roles.has("mosque_admin")) {
    links.push({ href: "/admin", label: t("adminView") });
  }
  if (current !== "teacher" && roles.has("teacher")) {
    links.push({ href: "/teacher", label: t("teacherView") });
  }
  if (current !== "examiner" && roles.has("examiner")) {
    links.push({ href: "/examiner", label: t("examinerView") });
  }
  if (current !== "parent" && roles.has("parent")) {
    links.push({ href: "/parent", label: t("parentView") });
  }
  if (current !== "student" && roles.has("student")) {
    links.push({ href: "/student", label: t("studentView") });
  }

  if (links.length === 0) return null;

  return (
    <>
      {links.map((l) => (
        <NavLink
          key={l.href}
          href={l.href}
          label={l.label}
          icon={<ArrowLeftRight className="h-4 w-4 shrink-0" />}
        />
      ))}
    </>
  );
}
