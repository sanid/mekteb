"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Heart, ChevronRight } from "lucide-react";
import { getTranslatedRelation } from "@/lib/relations";
import { buttonVariants } from "@/components/ui/button";
import { emptyCard, listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

import { inputCls } from "@/components/FormField";
export type ParentType = {
  id: string;
  relation: string | null;
  is_active: boolean;
  profiles: {
    full_name: string | null;
    display_name: string | null;
  } | null;
  studentNames: string[];
};

export function ParentListClient({
  initialParents,
  locale,
}: {
  initialParents: ParentType[];
  locale: string;
}) {
  const t = useTranslations("Admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
  const filteredParents = searchQuery.trim().length >= 2
    ? initialParents.filter((p) => {
        const profile = p.profiles;
        const name = (profile?.display_name ?? profile?.full_name ?? "").toLowerCase();
        const matchesQuery = name.includes(searchQuery.toLowerCase()) || 
          p.studentNames.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesQuery;
      })
    : initialParents;

  const totalPages = Math.ceil(filteredParents.length / itemsPerPage);
  const paginatedParents = filteredParents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header Stat with Count */}
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-muted" />
        <h2 className="text-base font-semibold tracking-tight">{t("parents")}</h2>
        {filteredParents.length > 0 && (
          <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2.5 py-0.5 ml-1">
            {searchQuery.trim().length >= 2 ? `${filteredParents.length} / ${initialParents.length}` : initialParents.length}
          </span>
        )}
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

      {/* List */}
      {paginatedParents.length > 0 ? (
        <div className="space-y-4">
          <ul className={cn(listCard, "bg-card")}>
            {paginatedParents.map((p) => {
              const profile = p.profiles;
              return (
                <li key={p.id}>
                  <Link
                    href={`/admin/parents/${p.id}`}
                    prefetch={true}
                    className="block p-4 hover:bg-accent-subtle transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-sm group-hover:text-accent transition-colors">
                            {profile?.display_name ?? profile?.full_name ?? t("noName")}
                          </span>
                          {p.relation ? (
                            <span className="text-[11px] font-semibold text-muted bg-accent-subtle/50 px-2 py-0.5 rounded-full">
                              {getTranslatedRelation(p.relation, locale)}
                            </span>
                          ) : null}
                        </div>
                        {p.studentNames.length > 0 && (
                          <div className="text-xs text-muted truncate">
                            {p.studentNames.join(", ")}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </li>
              );
            })}
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
          {searchQuery.trim().length >= 2 ? t("noResults") : t("noParents")}
        </div>
      )}
    </div>
  );
}
