import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";

import { Link } from "@/i18n/routing";
import { SubmitButton } from "@/components/SubmitButton";
import PublicHeader from "@/components/PublicHeader";
import { MosqueIcon } from "@/components/icons";
import { getMosqueForRequest } from "@/lib/mosque-from-slug";
import { getActivePlugins } from "@/lib/plugins";

import { submitEnrollmentRequest } from "./actions";

const field =
  "mt-1 w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20";

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ status }, t, mosque] = await Promise.all([
    searchParams,
    getTranslations("Enroll"),
    getMosqueForRequest(),
  ]);

  // Plugin gate (only meaningful when a mosque is resolved).
  const enabled = mosque ? (await getActivePlugins(mosque.id)).has("enrollment") : true;

  const errorMessage =
    status === "throttled"
      ? t("errorThrottled")
      : status === "invalid"
        ? t("errorInvalid")
        : status === "error"
          ? t("errorGeneric")
          : null;

  return (
    <div className="flex-1 flex flex-col">
      {!mosque && <PublicHeader hideNavLinks />}

      <main className="flex-1 grid place-items-center p-6 sm:p-8">
        <div className="w-full max-w-lg space-y-5 rounded-xl border border-card-border bg-card p-6 shadow-lg">
          <div className="flex flex-col items-center gap-2 text-center pb-1">
            <MosqueIcon className="h-10 w-10 text-accent" />
            <h1 className="text-xl font-semibold">{mosque ? mosque.name : t("title")}</h1>
            <p className="text-sm text-muted">{t("subtitle")}</p>
          </div>

          {!mosque ? (
            <p className="rounded-lg bg-warning-subtle px-4 py-3 text-sm text-warning-fg">
              {t("noMosque")}
            </p>
          ) : !enabled ? (
            <p className="rounded-lg bg-surface px-4 py-3 text-sm text-muted">{t("disabled")}</p>
          ) : status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <h2 className="text-base font-semibold tracking-tight">{t("successTitle")}</h2>
              <p className="text-sm text-muted">{t("successBody")}</p>
              <Link href="/login" className="text-sm font-semibold text-accent hover:underline">
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <form action={submitEnrollmentRequest} className="space-y-4">
              <input type="hidden" name="mosque_slug" value={mosque.slug} />

              {errorMessage && (
                <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger-fg" role="alert">
                  {errorMessage}
                </p>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("parentSection")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block"><span className="text-sm font-medium">{t("parentName")}</span>
                    <input name="parent_name" required maxLength={120} className={field} />
                  </label>
                  <label className="block"><span className="text-sm font-medium">{t("parentPhone")}</span>
                    <input name="parent_phone" type="tel" maxLength={40} className={field} />
                  </label>
                </div>
                <label className="block"><span className="text-sm font-medium">{t("parentEmail")}</span>
                  <input name="parent_email" type="email" required maxLength={200} className={field} />
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("childSection")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block"><span className="text-sm font-medium">{t("childName")}</span>
                    <input name="child_name" required maxLength={120} className={field} />
                  </label>
                  <label className="block"><span className="text-sm font-medium">{t("childBirthYear")}</span>
                    <input name="child_birth_year" type="number" min={1900} max={2100} className={field} />
                  </label>
                </div>
              </div>

              <label className="block"><span className="text-sm font-medium">{t("messageLabel")}</span>
                <textarea name="message" rows={3} maxLength={1000} className={`${field} resize-none`} />
              </label>

              <p className="text-xs text-muted">{t("privacyNote")}</p>
              <SubmitButton className="w-full justify-center">{t("submit")}</SubmitButton>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
