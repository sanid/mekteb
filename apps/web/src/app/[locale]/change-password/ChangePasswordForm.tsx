"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { changePassword, type ChangePasswordState } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { inputCls } from "@/components/FormField";
export default function ChangePasswordForm({
  firstLogin,
}: {
  firstLogin: boolean;
}) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    null,
  );

  return (
    <form
      action={formAction}
      className="w-full max-w-sm space-y-5 rounded-xl border border-card-border bg-card p-6 shadow-lg"
    >
      <div>
        <h1 className="text-xl font-semibold">{t("changePassword")}</h1>
        {firstLogin ? (
          <p className="mt-1 text-sm text-muted">
            {t("setPermanent")}
          </p>
        ) : null}
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("currentPassword")}</span>
        <input
          type="password"
          name="current_password"
          required
          className={inputCls}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("newPassword")}</span>
        <input
          type="password"
          name="new_password"
          required
          minLength={8}
          className={inputCls}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("confirmPassword")}</span>
        <input
          type="password"
          name="confirm_password"
          required
          minLength={8}
          className={inputCls}
        />
      </label>

      {state && !state.ok ? (
        <p className="text-sm text-danger-fg" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        disabled={pending}
        className={cn(buttonVariants({ size: "xl" }), "w-full")}
      >
        {pending ? t("updating") : t("updatePassword")}
      </button>
    </form>
  );
}
