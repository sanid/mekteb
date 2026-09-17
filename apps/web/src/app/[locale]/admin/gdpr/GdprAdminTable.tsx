"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

import { buttonVariants } from "@/components/ui/button";
import { useConfirm } from "@/components/ConfirmDialog";
type Row = {
  id: string;
  user_id: string;
  email: string | null;
  type: "export" | "deletion";
  status:
    | "pending"
    | "processing"
    | "sent"
    | "completed"
    | "rejected"
    | "failed";
  reason: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
};

async function authedFetch(
  supabase: ReturnType<typeof createClient>,
  url: string,
  init: RequestInit = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
  });
}

export default function GdprAdminTable({ initial }: { initial: Row[] }) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const [confirm, confirmDialog] = useConfirm();
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deleteUser(id: string, email: string | null) {
    if (!(await confirm({ title: t("gdprDeleteUserConfirm", { email: email ?? "—" }) }))) return;
    setBusyId(id);
    try {
      const res = await authedFetch(
        supabase,
        `/api/v1/admin/gdpr-requests/${id}/execute-deletion`,
        { method: "POST" },
      );
      const body = await res.json();
      if (res.ok && body.ok) {
        toast.success(t("gdprUserDeleted"));
        setRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "completed" as const,
                  processed_at: new Date().toISOString(),
                }
              : r,
          ),
        );
      } else {
        toast.error(body.error ?? t("gdprDeleteUserFailed"));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function action(id: string, status: "completed" | "rejected") {
    setBusyId(id);
    try {
      const res = await authedFetch(
        supabase,
        `/api/v1/admin/gdpr-requests/${id}`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      const body = await res.json();
      if (res.ok && body.ok) {
        toast.success(t("gdprUpdated"));
        setRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  processed_at: new Date().toISOString(),
                }
              : r,
          ),
        );
      } else {
        toast.error(body.error ?? t("gdprUpdateFailed"));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-card-border p-8 text-center text-sm text-muted">
      {confirmDialog}
        {t("gdprNone")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-card-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-card-border">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">
                {t("gdprWhen")}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">
                {t("gdprType")}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">
                {t("gdprUser")}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">
                {t("gdprStatus")}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">
                {t("gdprReason")}
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted">
                {t("gdprActions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {rows.map((r) => {
              const isOpen = r.status === "pending" || r.status === "processing";
              return (
                <tr key={r.id} className="hover:bg-card transition-colors">
                  <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                    {formatDateTime(r.requested_at, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.type === "deletion"
                          ? "rounded bg-danger-subtle text-danger-fg px-2 py-0.5 text-xs"
                          : "rounded bg-accent-subtle text-accent px-2 py-0.5 text-xs"
                      }
                    >
                      {t(`gdprType_${r.type}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>{r.email ?? <span className="italic text-muted">{t("gdprAnonymized")}</span>}</div>
                    {r.email && (
                      <div className="text-xs text-muted font-mono">
                        {r.user_id.slice(0, 8)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "sent" || r.status === "completed"
                          ? "text-success-fg text-xs font-medium"
                          : r.status === "failed" || r.status === "rejected"
                            ? "text-danger-fg text-xs font-medium"
                            : "text-warning-fg text-xs font-medium"
                      }
                    >
                      {t(`gdprStatus_${r.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs max-w-sm">
                    {r.reason || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isOpen && r.type === "deletion" ? (
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          onClick={() => deleteUser(r.id, r.email)}
                          disabled={busyId === r.id}
                          className={buttonVariants({ variant: "danger", size: "sm" })}
                          title={t("gdprDeleteUserTooltip")}
                        >
                          {t("gdprDeleteUser")}
                        </button>
                        <button
                          onClick={() => action(r.id, "completed")}
                          disabled={busyId === r.id}
                          className="rounded-md border border-card-border px-3 py-1 text-xs font-semibold hover:bg-card disabled:opacity-50"
                        >
                          {t("gdprMarkCompleted")}
                        </button>
                        <button
                          onClick={() => action(r.id, "rejected")}
                          disabled={busyId === r.id}
                          className="rounded-md border border-card-border px-3 py-1 text-xs font-semibold hover:bg-card disabled:opacity-50"
                        >
                          {t("gdprReject")}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
