import { getLocale, getTranslations } from "next-intl/server";

import { ClipboardList } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

import { inputCls } from "@/components/FormField";
import { cn } from "@/lib/utils";
const PAGE_SIZE = 50;

type SearchParams = Promise<{ page?: string; action?: string }>;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getLocale();
  const { page: pageParam, action: actionFilter } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  let query = supabase
    .from("audit_logs")
    .select("id, action, actor_user_id, target_table, target_id, metadata, created_at", { count: "exact" })
    .eq("mosque_id", ctx.mosqueId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (actionFilter) {
    query = query.ilike("action", `%${actionFilter}%`);
  }

  const { data: logs, count } = await query;

  // Fetch display names for actors on this page (profiles FK is public.profiles.id).
  const actorIds = [
    ...new Set((logs ?? []).map((l) => l.actor_user_id).filter(Boolean)),
  ] as string[];
  const { data: profiles } =
    actorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, display_name")
          .in("id", actorIds)
      : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? p.full_name ?? null]),
  );

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<ClipboardList className="h-5 w-5" />}
        title={t("auditLog")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("auditLog") },
        ]}
      />

      {/* Filter bar */}
      <form className="flex gap-2">
        <input
          name="action"
          defaultValue={actionFilter ?? ""}
          placeholder={t("filterByAction")}
          className={cn(inputCls, "w-64")}
        />
        <button
          type="submit"
          className={buttonVariants({ variant: "outline", size: "xl" })}
        >
          {t("filter")}
        </button>
        {actionFilter ? (
          <a
            href="?"
            className={buttonVariants({ variant: "outline", size: "xl" })}
          >
            {t("clearFilter")}
          </a>
        ) : null}
      </form>

      {/* Log table */}
      <div className="rounded-xl border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 border-b border-card-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditWhen")}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditAction")}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditActor")}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditTarget")}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditMeta")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {(logs ?? []).map((log) => {
                const actorName =
                  (log.actor_user_id ? profileMap.get(log.actor_user_id) : null) ??
                  log.actor_user_id?.slice(0, 8) ??
                  "—";
                const meta = log.metadata as Record<string, unknown> | null;
                return (
                  <tr key={log.id} className="hover:bg-card transition-colors">
                    <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                      {formatDateTime(log.created_at, locale)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className="rounded bg-accent-subtle text-accent px-1.5 py-0.5">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">{actorName}</td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {log.target_table ? (
                        <span>
                          {log.target_table}
                          {log.target_id ? (
                            <span className="font-mono"> /{log.target_id.slice(0, 8)}</span>
                          ) : null}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs font-mono max-w-xs truncate">
                      {meta ? JSON.stringify(meta) : "—"}
                    </td>
                  </tr>
                );
              })}
              {!logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                    {t("noAuditLogs")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          {page > 1 ? (
            <a
              href={`?page=${page - 1}${actionFilter ? `&action=${actionFilter}` : ""}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("prev")}
            </a>
          ) : null}
          <span className="text-muted">
            {t("pageOf", { page, total: totalPages })}
          </span>
          {page < totalPages ? (
            <a
              href={`?page=${page + 1}${actionFilter ? `&action=${actionFilter}` : ""}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("next")}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
