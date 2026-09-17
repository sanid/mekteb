"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

type GdprRequest = {
  id: string;
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
};

async function authedFetch(
  supabase: ReturnType<typeof createClient>,
  url: string,
  init: RequestInit = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export default function GdprSection() {
  const locale = useLocale();
  const t = useTranslations("Account");
  const supabase = createClient();
  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await authedFetch(supabase, "/api/v1/account/gdpr-requests");
      const body = await res.json();
      if (res.ok && body.ok) {
        setRequests(body.data.requests ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && !ignore) {
          const { data: memberships } = await supabase
            .from("memberships")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "mosque_admin")
            .eq("is_active", true);
          if (memberships && memberships.length > 0) {
            setIsAdmin(true);
          }
        }

        const res = await authedFetch(supabase, "/api/v1/account/gdpr-requests");
        const body = await res.json();
        if (!ignore && res.ok && body.ok) {
          setRequests(body.data.requests ?? []);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  async function requestExport() {
    setExporting(true);
    try {
      const res = await authedFetch(supabase, "/api/v1/account/export", {
        method: "POST",
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        toast.success(t("gdprExportSent"));
        load();
      } else {
        toast.error(body.error ?? t("gdprExportFailed"));
      }
    } finally {
      setExporting(false);
    }
  }

  async function requestDeletion() {
    setDeleting(true);
    try {
      const res = await authedFetch(
        supabase,
        "/api/v1/account/delete-request",
        {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() || undefined }),
        },
      );
      const body = await res.json();
      if (res.ok && body.ok) {
        toast.success(t("gdprDeleteSubmitted"));
        setConfirmingDelete(false);
        setReason("");
        load();
      } else {
        toast.error(body.error ?? t("gdprDeleteFailed"));
      }
    } finally {
      setDeleting(false);
    }
  }

  const pendingDeletion = requests.some(
    (r) => r.type === "deletion" && r.status === "pending",
  );

  return (
    <section className="rounded-xl border border-card-border bg-card p-6 space-y-5 mt-6">
      <div>
        <h2 className="text-base font-semibold">{t("gdprTitle")}</h2>
        <p className="text-sm text-muted mt-1">{t("gdprDesc")}</p>
      </div>

      {/* Export */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("gdprExportTitle")}</h3>
        <p className="text-sm text-muted">{t("gdprExportDesc")}</p>
        <button
          onClick={requestExport}
          disabled={exporting}
          className={buttonVariants({ size: "xl" })}
        >
          {exporting ? t("gdprExporting") : t("gdprExportButton")}
        </button>
      </div>

      <div className="border-t border-card-border" />

      {/* Deletion */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("gdprDeleteTitle")}</h3>
        {isAdmin ? (
          <p className="text-sm text-warning-fg font-medium">
            {t("gdprDeleteAdminBlocked")}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">{t("gdprDeleteDesc")}</p>
            {pendingDeletion ? (
              <p className="text-sm text-warning-fg">
                {t("gdprDeletePending")}
              </p>
            ) : !confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger-fg hover:bg-danger-subtle transition-colors cursor-pointer"
              >
                {t("gdprDeleteButton")}
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <label className="block text-sm font-medium">
                  {t("gdprDeleteReasonLabel")}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={t("gdprDeleteReasonPlaceholder")}
                  className="w-full rounded-lg border border-card-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={requestDeletion}
                    disabled={deleting}
                    className={buttonVariants({ variant: "danger" })}
                  >
                    {deleting ? t("gdprSubmitting") : t("gdprDeleteConfirm")}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingDelete(false);
                      setReason("");
                    }}
                    disabled={deleting}
                    className="rounded-lg border border-card-border px-4 py-2 text-sm font-semibold hover:bg-card transition-colors cursor-pointer"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* History */}
      {!loading && requests.length > 0 && (
        <div className="pt-4 border-t border-card-border">
          <h3 className="text-sm font-medium mb-2">{t("gdprHistory")}</h3>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-xs text-muted"
              >
                <span>
                  {t(`gdprType_${r.type}`)} ·{" "}
                  {formatDateTime(r.requested_at, locale)}
                </span>
                <span
                  className={
                    r.status === "sent" || r.status === "completed"
                      ? "text-success-fg"
                      : r.status === "failed" || r.status === "rejected"
                        ? "text-danger-fg"
                        : "text-warning-fg"
                  }
                >
                  {t(`gdprStatus_${r.status}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
