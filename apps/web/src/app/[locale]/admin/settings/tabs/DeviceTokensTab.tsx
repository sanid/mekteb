import { getLocale, getTranslations } from "next-intl/server";
import { Smartphone } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { deleteDeviceToken } from "../../device-tokens/actions";

import { buttonVariants } from "@/components/ui/button";
export async function DeviceTokensTab() {
  const locale = await getLocale();
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("id, platform, token, app_version, device_model, locale, last_seen_at, created_at, user_id")
    .eq("mosque_id", ctx.mosqueId)
    .order("last_seen_at", { ascending: false })
    .limit(200);

  const platformCount = (p: string) => (tokens ?? []).filter((x) => x.platform === p).length;
  const total = (tokens ?? []).length;

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-muted" />
        <div>
          <h2 className="text-base font-semibold">{t("deviceTokens")}</h2>
          <p className="text-xs text-muted">{t("deviceTokensDesc")}</p>
        </div>
      </div>

      {total > 0 ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-card-border/60 px-2.5 py-0.5">{t("devicesTotal", { count: total })}</span>
          <span className="rounded-full bg-info-subtle text-info-fg px-2.5 py-0.5">
            iOS {platformCount("ios")}
          </span>
          <span className="rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5">
            Android {platformCount("android")}
          </span>
          <span className="rounded-full bg-surface px-2.5 py-0.5">Web {platformCount("web")}</span>
        </div>
      ) : null}

      <div className="rounded-xl border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 border-b border-card-border">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{t("colPlatform")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{t("colDevice")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted hidden md:table-cell">{t("colLastSeen")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted hidden lg:table-cell">{t("colAppVersion")}</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {(tokens ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-xs">
                    {t("noDeviceTokens")}
                  </td>
                </tr>
              )}
              {(tokens ?? []).map((tok) => (
                <tr key={tok.id} className="hover:bg-surface align-middle">
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        tok.platform === "ios"
                          ? "bg-info-subtle text-info-fg"
                          : tok.platform === "android"
                            ? "bg-success-subtle text-success-fg"
                            : "bg-surface"
                      }`}
                    >
                      {tok.platform}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-mono text-xs max-w-[240px] truncate" title={tok.token}>
                      {(tok.device_model as string | null) ?? t("unknownDevice")}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[240px]">{tok.token}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                    {new Date(tok.last_seen_at).toLocaleString(locale)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">
                    {(tok.app_version as string | null) ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ActionForm
                      action={deleteDeviceToken.bind(null, tok.id)}
                      successMessage={t("deviceTokenDeleted")}
                      className="inline-block"
                    >
                      <button
                        type="submit"
                        className={buttonVariants({ variant: "destructive", size: "sm" })}
                      >
                        {t("delete")}
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
