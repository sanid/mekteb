import { signIn } from "./actions";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { SubmitButton } from "@/components/SubmitButton";
import { FormPendingBar } from "@/components/FormPendingBar";
import { PasswordInput } from "@/components/PasswordInput";
import PublicHeader from "@/components/PublicHeader";
import { getMosqueForRequest } from "@/lib/mosque-from-slug";
import { MosqueIcon } from "@/components/icons";
import { OpenInApp } from "@/components/OpenInApp";

import { inputCls } from "@/components/FormField";
import { HeroPattern } from "@/components/landing/HeroPattern";
import { Check, CircleAlert } from "lucide-react";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    email?: string;
    password?: string;
    open?: string;
  }>;
}) {
  const {
    error,
    email: prefillEmail,
    password: prefillPassword,
    open,
  } = await searchParams;
  const [t, mosque] = await Promise.all([
    getTranslations("Auth"),
    getMosqueForRequest(),
  ]);

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Header (Navbar without links) ── */}
      {!mosque && <PublicHeader hideNavLinks />}

      {/* ── Main Form Area ── */}
      <main className="relative flex flex-1 items-center overflow-hidden px-4 py-10 sm:px-6">
        <HeroPattern />
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20">
          <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
            <form
              action={signIn}
              // Re-keyed per error so a second wrong password shakes the card again.
              key={error ?? "form"}
              className={`relative w-full space-y-5 overflow-hidden rounded-xl border border-card-border bg-card p-6 shadow-overlay ${error ? "animate-shake" : ""}`}
            >
              <FormPendingBar />
              <div className="flex flex-col items-center gap-2 pb-2">
                <MosqueIcon className="h-10 w-10 text-accent" />
                {mosque ? (
                  <>
                    <h1 className="text-xl font-semibold">{mosque.name}</h1>
                    <p className="text-sm text-muted">{t("signIn")}</p>
                  </>
                ) : (
                  <h1 className="text-xl font-semibold">{t("signIn")}</h1>
                )}
              </div>

              {/* Hidden slug — tells the sign-in action which mosque to scope to */}
              {mosque && (
                <input type="hidden" name="mosque_slug" value={mosque.slug} />
              )}

              <label className="block space-y-1">
                <span className="text-sm font-medium">
                  {mosque ? t("emailOrUsername") : t("email")}
                </span>
                <input
                  name="email"
                  required
                  autoComplete={mosque ? "username" : "email"}
                  autoFocus={!prefillEmail}
                  defaultValue={prefillEmail ?? ""}
                  className={inputCls}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("password")}</span>
                <PasswordInput
                  name="password"
                  required
                  defaultValue={prefillPassword ?? ""}
                />
              </label>

              {error ? (
                <p
                  className="flex items-start gap-2 rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger-fg"
                  role="alert"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              ) : null}

              {/* Arrived via a scan-to-login QR: offer the app before the form. */}
              {open === "1" && prefillEmail && prefillPassword ? (
                <OpenInApp email={prefillEmail} password={prefillPassword} />
              ) : null}

              <SubmitButton fullWidth pendingText={t("signingIn")}>
                {t("signIn")}
              </SubmitButton>

              <Link
                href="/forgot-password"
                className="block text-center text-sm text-accent hover:underline"
              >
                {t("forgotPassword")}
              </Link>

              {mosque && (
                <Link
                  href="/enroll"
                  className="block text-center text-sm text-muted hover:text-accent hover:underline"
                >
                  {t("enrollCta")}
                </Link>
              )}
            </form>

            {!mosque ? (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted">
                <span>
                  {t("noAccount")}{" "}
                  <Link
                    href="/onboarding"
                    className="font-medium text-accent hover:underline"
                  >
                    {t("registerMosque")}
                  </Link>
                </span>
                <Link
                  href="/demo"
                  className="font-medium text-foreground hover:text-accent hover:underline"
                >
                  {t("tryDemo")}
                </Link>
              </div>
            ) : null}
          </div>

          {/* Desktop only: what's waiting on the other side of the form */}
          <aside className="hidden lg:block">
            <h2 className="text-3xl font-bold tracking-tight">
              {t("welcomeBack")}
            </h2>
            <p className="mt-2 text-muted">{t("loginSubtitle")}</p>
            <ul className="mt-8 space-y-3 text-base">
              {(
                [
                  "loginRoleTeacher",
                  "loginRoleParent",
                  "loginRoleAdmin",
                ] as const
              ).map((k) => (
                <li key={k} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
