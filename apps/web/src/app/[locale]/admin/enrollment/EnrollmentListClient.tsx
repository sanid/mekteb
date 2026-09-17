"use client";

import { useState, useTransition } from "react";
import { Check, X, Trash2, Mail, Phone, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Link } from "@/i18n/routing";
import { approveEnrollment, rejectEnrollment, deleteEnrollment } from "./actions";

import { buttonVariants } from "@/components/ui/button";
export type EnrollmentRequest = {
  id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string | null;
  child_name: string;
  child_birth_year: number | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Labels = {
  empty: string;
  pending: string;
  approved: string;
  rejected: string;
  approve: string;
  reject: string;
  delete: string;
  createAccount: string;
  born: string;
  filterAll: string;
  filterPending: string;
};

const STATUS_BADGE: Record<EnrollmentRequest["status"], string> = {
  pending: "bg-warning-subtle text-warning-fg",
  approved: "bg-success-subtle text-success-fg",
  rejected: "bg-danger-subtle text-danger-fg",
};

export function EnrollmentListClient({
  requests,
  labels,
}: {
  requests: EnrollmentRequest[];
  labels: Labels;
}) {
  const [pending, startTransition] = useTransition();
  const [onlyPending, setOnlyPending] = useState(true);

  const statusLabel: Record<EnrollmentRequest["status"], string> = {
    pending: labels.pending,
    approved: labels.approved,
    rejected: labels.rejected,
  };

  const visible = onlyPending ? requests.filter((r) => r.status === "pending") : requests;

  function run(action: () => Promise<{ error: string } | { ok: true }>, ok: string) {
    startTransition(async () => {
      const res = await action();
      if ("error" in res) toast.error(res.error);
      else toast.success(ok);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { key: true, label: labels.filterPending },
          { key: false, label: labels.filterAll },
        ].map((f) => (
          <button
            key={String(f.key)}
            type="button"
            onClick={() => setOnlyPending(f.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              onlyPending === f.key
                ? "bg-accent text-primary-foreground"
                : "border border-card-border hover:border-accent/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border py-12 text-center text-sm text-muted">
          {labels.empty}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className="rounded-xl border border-card-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.child_name}</span>
                    {r.child_birth_year && (
                      <span className="text-xs text-muted">· {labels.born} {r.child_birth_year}</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{r.parent_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <a href={`mailto:${r.parent_email}`} className="flex items-center gap-1 hover:text-accent">
                      <Mail className="h-3 w-3" /> {r.parent_email}
                    </a>
                    {r.parent_phone && (
                      <a href={`tel:${r.parent_phone}`} className="flex items-center gap-1 hover:text-accent">
                        <Phone className="h-3 w-3" /> {r.parent_phone}
                      </a>
                    )}
                  </div>
                  {r.message && <p className="text-sm whitespace-pre-wrap pt-1">{r.message}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {r.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => approveEnrollment(r.id), labels.approved)}
                        className={buttonVariants({ size: "sm" })}
                      >
                        <Check className="h-3.5 w-3.5" /> {labels.approve}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => rejectEnrollment(r.id), labels.rejected)}
                        className="flex items-center gap-1 rounded-lg border border-card-border px-2.5 py-1.5 text-xs font-semibold hover:border-danger hover:text-danger-fg disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> {labels.reject}
                      </button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <Link
                      href="/admin/parents/new"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> {labels.createAccount}
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => deleteEnrollment(r.id), labels.delete)}
                    className="rounded-lg border border-card-border p-1.5 text-muted hover:border-danger hover:text-danger-fg disabled:opacity-50"
                    aria-label={labels.delete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
