"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Layout, Plus, Trash2, Edit3, CheckCircle2, Loader2 } from "lucide-react";

import { saveDiplomaTemplate, deleteDiplomaTemplate, toggleTemplateActive } from "./actions";
import { FormField, inputCls } from "@/components/FormField";
import { buttonVariants } from "@/components/ui/button";
import { formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

import { useConfirm } from "@/components/ConfirmDialog";
const VARIANT_PREVIEW: Record<string, string> = {
  fancy:   "dtFancy",
  clean:   "dtClean",
  islamic: "dtIslamic",
};

type TemplateItem = {
  id: string;
  name: string;
  orientation: string;
  is_active: boolean;
  system_key: string | null;
  background_image_url: string | null;
  created_at: string;
};

export function TemplatesListClient({
  initialTemplates,
}: {
  initialTemplates: TemplateItem[];
}) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [orientation, setOrientation] = useState("landscape");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const res = await saveDiplomaTemplate(null, {
        name: name.trim(),
        orientation,
        background_image_url: null,
        elements: [],
      });

      if ("error" in res) {
        toast.error(res.error);
      } else if (res.data) {
        toast.success(t("dtCreated"));
        router.push(`/admin/settings/diplomas/${res.data}`);
      }
    });
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    startTransition(async () => {
      const nextActive = !currentlyActive;
      const res = await toggleTemplateActive(id, nextActive);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(nextActive ? t("dtActivated") : t("dtDeactivated"));
        router.refresh();
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: t("dtDeleteConfirm") }))) return;

    startTransition(async () => {
      const res = await deleteDiplomaTemplate(id);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("dtDeleted"));
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight ">{t("dtExisting")}</h2>
        <button
          type="button"
          onClick={() => setCreateOpen((o) => !o)}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("dtCreate")}
        </button>
      </div>

      {createOpen && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-card-border bg-card p-5">
          <h3 className="font-semibold text-sm">{t("dtNew")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t("dtName")} required>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("dtNamePh")}
                className={inputCls}
                disabled={isPending}
              />
            </FormField>
            <FormField label={t("dtOrientation")}>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className={cn(inputCls, "mt-1")}
                disabled={isPending}
              >
                <option value="landscape">{t("dtLandscape")}</option>
                <option value="portrait">{t("dtPortrait")}</option>
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
              disabled={isPending}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={buttonVariants({ size: "sm" })}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("dtCreateEdit")}
            </button>
          </div>
        </form>
      )}

      {initialTemplates.length > 0 ? (
        <ul className={cn(listCard, "bg-card")}>
          {initialTemplates.map((tmpl) => (
            <li key={tmpl.id} className="flex items-center justify-between p-4 hover:bg-accent-subtle/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                  <Layout className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm flex flex-wrap items-center gap-1.5">
                    {tmpl.name}
                    {tmpl.system_key && (
                      <span className="rounded-full bg-info-subtle text-info-fg text-[11px] font-semibold px-2 py-0.5">
                        {t("dtStandard")}
                      </span>
                    )}
                    {tmpl.is_active && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-success-subtle text-success-fg text-[11px] font-semibold px-2 py-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {t("dtActive")}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {tmpl.system_key
                      ? (VARIANT_PREVIEW[tmpl.system_key] ? t(VARIANT_PREVIEW[tmpl.system_key]) : tmpl.system_key)
                      : `${tmpl.orientation === "landscape" ? t("dtLandscape") : t("dtPortrait")} · ${t("dtCreatedOn")} ${formatDateShort(tmpl.created_at, locale)}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  type="button"
                  onClick={() => handleToggleActive(tmpl.id, tmpl.is_active)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                    tmpl.is_active
                      ? "border-success/50 bg-success-subtle text-success-fg"
                      : "border-card-border hover:bg-accent-subtle"
                  }`}
                  disabled={isPending}
                >
                  {tmpl.is_active ? t("dtDeactivate") : t("dtActivate")}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/settings/diplomas/${tmpl.id}`)}
                  className="rounded-lg border border-card-border p-1.5 text-muted hover:text-foreground hover:bg-accent-subtle transition-all"
                  title={t("dtEdit")}
                  disabled={isPending}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                {!tmpl.system_key && (
                  <button
                    type="button"
                    onClick={() => handleDelete(tmpl.id)}
                    className="rounded-lg border border-card-border p-1.5 text-danger hover:text-danger-fg hover:bg-danger-subtle transition-all"
                    title={t("dtDelete")}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-card-border p-8 text-center text-sm text-muted bg-card/30">
          {t("dtEmpty")}
        </div>
      )}
    </div>
  );
}
