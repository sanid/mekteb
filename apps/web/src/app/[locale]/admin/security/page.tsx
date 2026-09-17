import { getTranslations, getLocale } from "next-intl/server";
import { Shield } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";

type SearchParams = Promise<{ tab?: string }>;

export default async function AdminSecurityPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab = "logins" } = await searchParams;
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  const tSec = await getTranslations("Security");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: logins }, { data: otps }, { data: passwordResets }] = await Promise.all([
    supabase
      .from("login_audit")
      .select("id, email, success, ip_address, user_agent, created_at")
      .eq("mosque_id", ctx.mosqueId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("otp_issues")
      .select("id, user_id, status, expires_at, activated_at, revoked_at, created_at")
      .eq("mosque_id", ctx.mosqueId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("password_reset_audit")
      .select("id, user_id, actor_user_id, event, metadata, created_at")
      .eq("mosque_id", ctx.mosqueId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  /**
   * The raw enum values were rendered straight into the table, so an admin saw
   * `pending` / `otp_issued` in English regardless of locale. Unknown values
   * still fall through to the raw string rather than a blank cell — a new
   * event type should be legible before it is translated.
   */
  const otpStatusLabel = (status: string) =>
    ({
      pending: tSec("otpPending"),
      activated: tSec("otpActivated"),
      expired: tSec("otpExpired"),
      revoked: tSec("otpRevoked"),
    })[status] ?? status;

  const eventLabel = (event: string) =>
    ({
      otp_issued: tSec("eventOtpIssued"),
      password_rotated: tSec("eventPasswordRotated"),
    })[event] ?? event;

  const tabs = [
    { key: "logins", label: tSec("loginLog") },
    { key: "otps", label: tSec("activationCodes") },
    { key: "resets", label: tSec("passwordResets") },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        icon={<Shield className="h-5 w-5" />}
        title={tSec("title")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: tSec("title") },
        ]}
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-card-border">
        {tabs.map((tabItem) => (
          <a
            key={tabItem.key}
            href={`?tab=${tabItem.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === tabItem.key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabItem.label}
          </a>
        ))}
      </div>

      {tab === "logins" && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground">{tSec("lastAttempts")}</p>
          <div className="rounded-xl border border-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/50 border-b border-card-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{tSec("colEmail")}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{tSec("colStatus")}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted hidden sm:table-cell">{tSec("colIp")}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{tSec("colDate")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {(logins ?? []).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-xs">{tSec("noEntries")}</td></tr>
                  )}
                  {(logins ?? []).map((l) => (
                    <tr key={l.id} className="hover:bg-surface">
                      <td className="px-4 py-2.5 font-mono text-xs max-w-[180px] truncate">{l.email ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                          l.success
                            ? "bg-success-subtle text-success-fg"
                            : "bg-danger-subtle text-danger-fg"
                        }`}>
                          {l.success ? tSec("success") : tSec("failed")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        {(l.ip_address as string | null) ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "otps" && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground">{tSec("activationCodesDesc")}</p>
          <div className="rounded-xl border border-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/50 border-b border-card-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{tSec("colUser")}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{tSec("colStatus")}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted hidden sm:table-cell">{tSec("colExpiry")}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{tSec("colCreated")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {(otps ?? []).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-xs">{tSec("noEntries")}</td></tr>
                  )}
                  {(otps ?? []).map((o) => {
                    const statusColor: Record<string, string> = {
                      pending:   "bg-warning-subtle text-warning-fg",
                      activated: "bg-success-subtle text-success-fg",
                      expired:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                      revoked:   "bg-danger-subtle text-danger-fg",
                    };
                    return (
                      <tr key={o.id} className="hover:bg-surface">
                        <td className="px-4 py-2.5 font-mono text-xs">{o.user_id.slice(0, 8)}…</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${statusColor[o.status] ?? ""}`}>
                            {otpStatusLabel(o.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                          {new Date(o.expires_at).toLocaleString(locale)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString(locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "resets" && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground">{tSec("passwordResetsDesc")}</p>
          <div className="rounded-xl border border-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/50 border-b border-card-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{tSec("colUser")}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted hidden sm:table-cell">{tSec("colReason")}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{tSec("colDate")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {(passwordResets ?? []).length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground text-xs">{tSec("noEntries")}</td></tr>
                  )}
                  {(passwordResets ?? []).map((r) => (
                    <tr key={r.id} className="hover:bg-surface">
                      <td className="px-4 py-2.5 font-mono text-xs">{r.user_id?.slice(0, 8) ?? "—"}…</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                        {r.event ? eventLabel(r.event) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
