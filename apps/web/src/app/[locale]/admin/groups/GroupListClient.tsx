"use client";

import { useOptimistic, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ChevronRight, Plus, Users, X } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { FormField, FormCard, inputCls, selectCls } from "@/components/FormField";
import { createGroup } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { emptyCard, listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

export type GroupType = {
  id: string;
  name: string;
  description: string | null;
  room?: string | null;
  is_active: boolean;
  created_at: string;
  category_id?: string | null;
  category?: { id: string; name: string; color: string } | null;
};

export type CategoryType = {
  id: string;
  name: string;
  color: string;
};

export function GroupListClient({
  initialGroups,
  categories,
}: {
  initialGroups: GroupType[];
  categories: CategoryType[];
}) {
  const t = useTranslations("Admin");
  const formRef = useRef<HTMLFormElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [optimisticGroups, addOptimisticGroup] = useOptimistic(
    initialGroups,
    (state, newGroup: GroupType) => [newGroup, ...state],
  );

  // Reset to the first page whenever the search changes. Adjusting state
  // during render (rather than in an effect) avoids a second render pass
  // showing a stale page. See react.dev "You Might Not Need an Effect".
  const [pagedQuery, setPagedQuery] = useState(searchQuery);
  if (pagedQuery !== searchQuery) {
    setPagedQuery(searchQuery);
    setCurrentPage(1);
  }

  const itemsPerPage = 20;

  // Search instantly on keypress after second character
  const filteredGroups = searchQuery.trim().length >= 2
    ? optimisticGroups.filter((g) => {
        const name = g.name.toLowerCase();
        const desc = (g.description ?? "").toLowerCase();
        const catName = (g.category?.name ?? "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || desc.includes(query) || catName.includes(query);
      })
    : optimisticGroups;

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  async function action(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const categoryId = String(formData.get("category_id") ?? "") || null;
    const room = String(formData.get("room") ?? "").trim() || null;
    if (!name) return;

    formRef.current?.reset();
    addOptimisticGroup({
      id: Date.now().toString(),
      name,
      description,
      room,
      is_active: true,
      created_at: new Date().toISOString(),
      category_id: categoryId,
      category: categories.find((cat) => cat.id === categoryId) ?? null,
    });

    await createGroup(formData);
    setAddOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted" />
        <h2 className="text-base font-semibold tracking-tight">{t("groups")}</h2>
        {filteredGroups.length > 0 && (
          <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2.5 py-0.5 ml-1">
            {searchQuery.trim().length >= 2 ? `${filteredGroups.length} / ${optimisticGroups.length}` : optimisticGroups.length}
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className={buttonVariants({ size: "sm" })}
        >
          {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {addOpen ? t("cancel") : t("addGroup")}
        </button>
      </div>

      {/* Interactive Search Bar */}
      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("search")}
          className={cn(inputCls, "flex-1")}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className={buttonVariants({ variant: "outline", size: "xl" })}
          >
            {t("clearFilter")}
          </button>
        ) : null}
      </div>

      {/* Create form */}
      {addOpen ? (
      <FormCard title={t("addGroup")} description={t("groupFormDesc")}>
        <form ref={formRef} action={action} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t("groupName")} required>
              <input
                name="name"
                required
                placeholder={t("groupNamePlaceholder")}
                className={inputCls}
              />
            </FormField>
            <FormField label={t("descriptionOpt")}>
              <input
                name="description"
                placeholder={t("descriptionPlaceholder")}
                className={inputCls}
              />
            </FormField>
            <FormField label={t("groupCategoryLabel")}>
              <select name="category_id" defaultValue="" className={selectCls}>
                <option value="">{t("selectCategory")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("groupRoom")}>
              <input
                name="room"
                placeholder={t("groupRoomPlaceholder")}
                className={inputCls}
              />
            </FormField>
          </div>
          <SubmitButton pendingText={t("saving")}>
            {t("addGroup")}
          </SubmitButton>
        </form>
      </FormCard>
      ) : null}

      {/* List */}
      {paginatedGroups.length > 0 ? (
        <div className="space-y-4">
          <ul className={cn(listCard, "bg-card")}>
            {paginatedGroups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/admin/groups/${g.id}`}
                  prefetch
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-accent-subtle group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {g.name}
                      {g.category && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white whitespace-nowrap"
                          style={{ backgroundColor: g.category.color }}
                        >
                          {g.category.name}
                        </span>
                      )}
                    </div>
                    {g.description && (
                      <div className="text-sm text-muted truncate">{g.description}</div>
                    )}
                    {g.room && (
                      <div className="text-xs text-muted truncate">{g.room}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-card-border pt-4 px-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("prev")}
              </button>

              <span className="text-xs text-muted">
                {t("pageOf", { page: currentPage, total: totalPages })}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("next")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={emptyCard}>
          {searchQuery.trim().length >= 2 ? t("noResults") : t("noGroups")}
        </div>
      )}
    </div>
  );
}
