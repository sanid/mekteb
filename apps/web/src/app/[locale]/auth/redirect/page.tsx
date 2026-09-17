import { createClient } from "@/lib/supabase/server";
import { resolvePrimaryRole } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function AuthRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const [profileResult, membershipsResult, studentProfileResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("must_rotate_password")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase
        .from("student_profiles")
        .select("id")
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

  const locale = await getLocale();
  if (profileResult.data?.must_rotate_password) {
    redirect(`/${locale}/change-password`);
  }

  const role = resolvePrimaryRole(
    membershipsResult.data ?? [],
    !!studentProfileResult.data,
  );
  const landingPath =
    role === "platform_owner"
      ? "platform-admin"
      : role === "mosque_admin"
        ? "admin"
        : role === "examiner"
          ? "examiner"
          : role === "teacher"
            ? "teacher"
            : role === "parent"
              ? "parent"
              : role === "student"
                ? "student"
                : "no-access";

  redirect(`/${locale}/${landingPath}`);
}
