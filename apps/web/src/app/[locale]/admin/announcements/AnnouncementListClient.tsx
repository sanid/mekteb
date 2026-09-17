"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Megaphone, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { FormField, FormCard, inputCls, selectCls } from "@/components/FormField";
import { createAnnouncement, deleteAnnouncement, publishAnnouncement } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  is_published: boolean;
  published_at: string | null;
  groups: { name: string } | null;
}

interface Group {
  id: string;
  name: string;
}

export function AnnouncementListClient({
  initialAnnouncements,
  groups,
}: {
  initialAnnouncements: Announcement[];
  groups: Group[];
}) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const submitTypeRef = useRef<"true" | "false">("true");
  const [addOpen, setAddOpen] = useState(false);

  const [optimisticAnnouncements, setOptimisticAnnouncements] = useOptimistic(
    initialAnnouncements,
    (
      state,
      action:
        | { type: "create"; payload: { title: string; body: string; audience: string; groupId: string | null; is_published: boolean } }
        | { type: "publish"; id: string }
        | { type: "delete"; id: string },
    ) => {
      switch (action.type) {
        case "create": {
          const newAnn: Announcement = {
            id: `temp-${Date.now()}`,
            title: action.payload.title,
            body: action.payload.body,
            audience: action.payload.audience,
            is_published: action.payload.is_published,
            published_at: action.payload.is_published ? new Date().toISOString() : null,
            groups: action.payload.groupId
              ? { name: groups.find((g) => g.id === action.payload.groupId)?.name ?? "" }
              : null,
          };
          return [newAnn, ...state];
        }
        case "publish":
          return state.map((a) =>
            a.id === action.id
              ? { ...a, is_published: true, published_at: new Date().toISOString() }
              : a,
          );
        case "delete":
          return state.filter((a) => a.id !== action.id);
        default:
          return state;
      }
    },
  );

  const handleCreate = async (formData: FormData) => {
    const isPublish = submitTypeRef.current === "true";
    formData.set("publish", submitTypeRef.current);

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const audience = String(formData.get("audience") ?? "mosque") as "mosque" | "group";
    const groupId = String(formData.get("group_id") ?? "").trim() || null;

    if (!title || !body) {
      toast.error(t("announcementTitleRequired"));
      return;
    }
    if (audience === "group" && !groupId) {
      toast.error(t("announcementGroupRequired"));
      return;
    }

    startTransition(async () => {
      setOptimisticAnnouncements({
        type: "create",
        payload: { title, body, audience, groupId, is_published: isPublish },
      });
      formRef.current?.reset();
      const res = await createAnnouncement(formData);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("announcementSaved"));
        setAddOpen(false);
      }
    });
  };

  const handlePublish = (id: string) => {
    startTransition(async () => {
      setOptimisticAnnouncements({ type: "publish", id });
      const res = await publishAnnouncement(id);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("announcementPosted"));
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      setOptimisticAnnouncements({ type: "delete", id });
      const res = await deleteAnnouncement(id);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("announcementDeleted"));
      }
    });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();

  const filtered = query.length >= 2
    ? optimisticAnnouncements.filter((a) =>
        a.title.toLowerCase().includes(query) || a.body.toLowerCase().includes(query)
      )
    : optimisticAnnouncements;

  const drafts = filtered.filter((a) => !a.is_published);
  const published = filtered.filter((a) => a.is_published);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-muted" />
        <h2 className="text-base font-semibold tracking-tight">{t("newAnnouncement")}</h2>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className={buttonVariants({ size: "sm" })}
        >
          {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {addOpen ? t("cancel") : t("newAnnouncement")}
        </button>
      </div>

      {/* Search */}
      {optimisticAnnouncements.length > 4 && (
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("search")}
            className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
          />
          {query.length >= 2 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
              {filtered.length} / {optimisticAnnouncements.length}
            </span>
          )}
        </div>
      )}

      {/* Create form */}
      {addOpen ? (
      <FormCard
        title={t("newAnnouncement")}
        description={t("announcementFormDesc")}
      >
        <form ref={formRef} action={handleCreate} className="space-y-4">
          <FormField label={t("announcementTitle")} required>
            <input
              name="title"
              required
              disabled={isPending}
              placeholder={t("announcementTitlePlaceholder")}
              className={inputCls}
            />
          </FormField>
          <FormField label={t("announcementBody")} required>
            <textarea
              name="body"
              required
              rows={4}
              disabled={isPending}
              placeholder={t("announcementBodyPlaceholder")}
              className={`${inputCls} resize-none`}
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t("audience")}>
              <select name="audience" disabled={isPending} className={selectCls}>
                <option value="mosque">{t("announcementAudienceMosque")}</option>
                <option value="group">{t("announcementAudienceGroup")}</option>
              </select>
            </FormField>
            {groups && groups.length > 0 ? (
              <FormField label={t("announcementGroup")}>
                <select name="group_id" disabled={isPending} className={selectCls}>
                  <option value="">{t("allGroups")}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              name="publish"
              value="true"
              disabled={isPending}
              onClick={() => {
                submitTypeRef.current = "true";
              }}
              className={buttonVariants({ size: "xl" })}
            >
              {t("postAnnouncement")}
            </button>
            <button
              type="submit"
              name="publish"
              value="false"
              disabled={isPending}
              onClick={() => {
                submitTypeRef.current = "false";
              }}
              className={buttonVariants({ variant: "outline", size: "xl" })}
            >
              {t("saveDraft")}
            </button>
          </div>
        </form>
      </FormCard>
      ) : null}

      {/* Drafts */}
      {drafts.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-semibold tracking-tight text-muted uppercase tracking-wide">{t("drafts")}</h2>
          <ul className={listCard}>
            {drafts.map((a) => {
              const groupName = a.groups?.name;
              return (
                <li key={a.id} className="p-4 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{a.title}</div>
                    <span className="shrink-0 text-xs bg-warning-subtle text-warning-fg rounded px-1.5 py-0.5">
                      {t("draft")}
                    </span>
                  </div>
                  <p className="text-sm text-muted whitespace-pre-line">{a.body}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-muted">{groupName ? groupName : t("mosqueWide")}</span>
                    <button
                      disabled={isPending}
                      onClick={() => handlePublish(a.id)}
                      className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      {t("publish")}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => handleDelete(a.id)}
                      className="text-sm text-danger hover:underline disabled:opacity-50"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Published */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight text-muted uppercase tracking-wide">{t("published")}</h2>
        <ul className={listCard}>
          {published.map((a) => {
            const groupName = a.groups?.name;
            return (
              <li key={a.id} className="p-4 space-y-1 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{a.title}</div>
                  <span className="shrink-0 text-xs text-muted bg-card-border rounded px-1.5 py-0.5">
                    {groupName ? groupName : t("mosqueWide")}
                  </span>
                </div>
                <p className="text-sm text-muted whitespace-pre-line">{a.body}</p>
                <div className="flex items-center gap-3 pt-1">
                  {a.published_at ? (
                    <span className="text-xs text-muted">{formatDateShort(a.published_at, locale)}</span>
                  ) : null}
                  <button
                    disabled={isPending}
                    onClick={() => handleDelete(a.id)}
                    className="text-sm text-danger hover:underline disabled:opacity-50"
                  >
                    {t("delete")}
                  </button>
                </div>
              </li>
            );
          })}
          {published.length === 0 ? (
            <li className="p-4 text-sm text-muted bg-card">{t("noAnnouncements")}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
