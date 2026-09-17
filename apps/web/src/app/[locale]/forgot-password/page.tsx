import { Link } from "@/i18n/routing";
import { requestPasswordReset } from "./actions";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { inputCls } from "@/components/FormField";
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <main className="flex-1 grid place-items-center p-8">
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-card-border bg-card p-6 shadow-lg">
        <div>
          <h1 className="text-xl font-semibold">{t("resetPasswordTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t("resetPasswordDesc")}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-success-fg">
              {t("resetLinkSent")}
            </p>
            <Link
              href="/login"
              className="block text-center text-sm text-accent hover:underline"
            >
              {t("backToSignIn")}
            </Link>
          </div>
        ) : (
          <form action={requestPasswordReset} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("email")}</span>
              <input
                type="email"
                name="email"
                required
                className={inputCls}
              />
            </label>

            {error ? (
              <p className="text-sm text-danger-fg" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className={cn(buttonVariants({ size: "xl" }), "w-full")}
            >
              {t("sendResetLink")}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-accent hover:underline"
            >
              {t("backToSignIn")}
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
