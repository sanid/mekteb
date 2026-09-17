"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Megaphone, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { FormField, inputCls, selectCls } from "@/components/FormField";
import {
  createAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  updateAnnouncement,
} from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

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

type Filter = "all" | "published" | "drafts";

export function TeacherAnnouncementListClient({
  initialAnnouncements,
  groups,
}: {
  initialAnnouncements: Announcement[];
  groups: Group[];
}) {
  const t = useTranslations("Teacher");
  const tAdmin = useTranslations("Admin");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const submitTypeRef = useRef<"true" | "false">("true");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const [announcements, setAnnouncements] = useState(initialAnnouncements);

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
      setAnnouncements((prev) => [
        {
          id: `temp-${Date.now()}`,
          title,
          body,
          audience,
          is_published: isPublish,
          published_at: isPublish ? new Date().toISOString() : null,
          groups: groupId
            ? { name: groups.find((g) => g.id === groupId)?.name ?? "" }
            : null,
        },
        ...prev,
      ]);
      formRef.current?.reset();
      const res = await createAnnouncement(formData);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(isPublish ? t("announcementPosted") : t("announcementSaved"));
        setAddOpen(false);
      }
    });
  };

  const handlePublish = (id: string) => {
    startTransition(async () => {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, is_published: true, published_at: new Date().toISOString() }
            : a,
        ),
      );
      const res = await publishAnnouncement(id);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("announcementPosted"));
      }
    });
  };

  const handleUpdate = (formData: FormData) => {
    const id = String(formData.get("announcement_id") ?? "");
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
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                title,
                body,
                audience,
                groups: groupId
                  ? { name: groups.find((g) => g.id === groupId)?.name ?? "" }
                  : null,
              }
            : a,
        ),
      );
      setEditing(null);
      const res = await updateAnnouncement(formData);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("announcementUpdated"));
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      const res = await deleteAnnouncement(id);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("announcementDeleted"));
      }
    });
  };

  const filtered = announcements.filter((a) => {
    if (filter === "published") return a.is_published;
    if (filter === "drafts") return !a.is_published;
    return true;
  });

  const audienceOptions = (
    <>
      <option value="mosque">{t("announcementAudienceMosque")}</option>
      <option value="group">{t("announcementAudienceGroup")}</option>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 rounded-lg bg-surface p-[3px]">
          {(["all", "published", "drafts"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "h-8 rounded-md px-3 text-sm font-medium transition-colors",
                filter === f
                  ? "bg-card text-foreground shadow-elevated"
                  : "text-muted hover:text-foreground",
              )}
            >
              {f === "all"
                ? t("all")
                : f === "published"
                  ? tAdmin("published")
                  : t("drafts")}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setAddOpen((o) => !o);
          }}
          className={buttonVariants({ size: "sm" })}
        >
          {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {addOpen ? tAdmin("cancel") : t("newAnnouncement")}
        </button>
      </div>

      {/* Create form */}
      {addOpen ? (
        <form ref={formRef} action={handleCreate} className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5">
          <input
            name="title"
            placeholder={t("announcementTitle")}
            required
            disabled={isPending}
            className={inputCls}
          />
          <textarea
            name="body"
            placeholder={t("announcementBody")}
            required
            rows={3}
            disabled={isPending}
            className={`${inputCls} resize-none`}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <select name="audience" disabled={isPending} className={selectCls}>
              {audienceOptions}
            </select>
            {groups.length > 0 ? (
              <select name="group_id" disabled={isPending} className={selectCls}>
                <option value="">{t("announcementGroup")}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              onClick={() => { submitTypeRef.current = "true"; }}
              className={buttonVariants({ size: "xl" })}
            >
              {t("postAnnouncement")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              onClick={() => { submitTypeRef.current = "false"; }}
              className={buttonVariants({ variant: "outline", size: "xl" })}
            >
              {t("saveDraft")}
            </button>
          </div>
        </form>
      ) : null}

      {/* Edit form */}
      {editing ? (
        <form
          action={handleUpdate}
          className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-card p-4"
        >
          <input type="hidden" name="announcement_id" value={editing.id} />
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-muted" />
            <span className="text-sm font-semibold">{t("editAnnouncement")}</span>
          </div>
          <input
            name="title"
            defaultValue={editing.title}
            required
            disabled={isPending}
            className={inputCls}
          />
          <textarea
            name="body"
            defaultValue={editing.body}
            required
            rows={3}
            disabled={isPending}
            className={`${inputCls} resize-none`}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <select name="audience" defaultValue={editing.audience} disabled={isPending} className={selectCls}>
              {audienceOptions}
            </select>
            {groups.length > 0 ? (
              <select
                name="group_id"
                defaultValue={editing.groups?.name ? groups.find((g) => g.name === editing.groups?.name)?.id ?? "" : ""}
                disabled={isPending}
                className={selectCls}
              >
                <option value="">{t("announcementGroup")}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={isPending} className={buttonVariants({ size: "xl" })}>
              {tAdmin("saveChanges")}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setEditing(null)}
              className={buttonVariants({ variant: "outline", size: "xl" })}
            >
              {tAdmin("cancel")}
            </button>
          </div>
        </form>
      ) : null}

      <ul className={listCard}>
        {filtered.map((a) => {
          const groupName = a.groups?.name;
          return (
            <li key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium flex items-center gap-2 flex-wrap">
                  {a.title}
                  {!a.is_published ? (
                    <span className="text-xs rounded-full bg-warning-subtle text-warning-fg px-2.5 py-0.5 font-semibold">
                      {tAdmin("draft")}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-xs text-muted bg-card-border rounded px-1.5 py-0.5">
                    {groupName ? groupName : t("mosqueWide")}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!a.is_published ? (
                    <button
                      disabled={isPending}
                      onClick={() => handlePublish(a.id)}
                      className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      {tAdmin("publish")}
                    </button>
                  ) : null}
                  <button
                    disabled={isPending}
                    onClick={() => { setAddOpen(false); setEditing(a); }}
                    className="text-sm text-muted hover:text-foreground hover:underline disabled:opacity-50"
                  >
                    {t("edit")}
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => handleDelete(a.id)}
                    className="text-sm text-danger hover:underline disabled:opacity-50"
                  >
                    {tAdmin("delete")}
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted whitespace-pre-line">{a.body}</p>
              {a.published_at ? (
                <div className="mt-1 text-xs text-muted">
                  {formatDateShort(a.published_at, locale)}
                </div>
              ) : null}
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noAnnouncements")}</li>
        ) : null}
      </ul>
    </div>
  );
}


