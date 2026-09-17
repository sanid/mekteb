"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BookOpen, ChevronRight, ShieldCheck, HandHelping } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { emptyCard, listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

import { inputCls } from "@/components/FormField";
export type TeacherType = {
  id: string;
  profile_id: string;
  bio: string | null;
  is_active: boolean;
  profiles: {
    full_name: string | null;
    display_name: string | null;
  } | null;
  roles: string[];
};

export function TeacherListClient({ initialTeachers }: { initialTeachers: TeacherType[] }) {
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
  const filteredTeachers = searchQuery.trim().length >= 2
    ? initialTeachers.filter((row) => {
        const profile = row.profiles;
        const name = (profile?.display_name ?? profile?.full_name ?? "").toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : initialTeachers;

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header Stat with Count */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-muted" />
        <h2 className="text-base font-semibold tracking-tight">{t("teachers")}</h2>
        {filteredTeachers.length > 0 && (
          <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2.5 py-0.5 ml-1">
            {searchQuery.trim().length >= 2 ? `${filteredTeachers.length} / ${initialTeachers.length}` : initialTeachers.length}
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
      {paginatedTeachers.length > 0 ? (
        <div className="space-y-4">
          <ul className={cn(listCard, "bg-card")}>
            {paginatedTeachers.map((row) => {
              const profile = row.profiles;
              return (
                <li key={row.id}>
                  <Link
                    href={`/admin/teachers/${row.id}`}
                    prefetch={true}
                    className="block p-4 hover:bg-accent-subtle transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-sm group-hover:text-accent transition-colors">
                            {profile?.display_name ?? profile?.full_name ?? t("noName")}
                          </span>
                          {row.roles.includes("examiner") ? (
                            <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-accent-subtle px-2.5 py-0.5 font-semibold text-accent font-semibold">
                              <ShieldCheck className="h-3 w-3" />
                              {t("examinerBadge")}
                            </span>
                          ) : null}
                          {row.roles.includes("assistant") ? (
                            <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-info-subtle px-2 py-0.5 text-info-fg font-semibold">
                              <HandHelping className="h-3 w-3" />
                              {t("assistantBadge")}
                            </span>
                          ) : null}
                        </div>
                        {row.bio ? (
                          <div className="text-xs text-muted leading-relaxed">
                            {row.bio}
                          </div>
                        ) : null}
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
          {searchQuery.trim().length >= 2 ? t("noResults") : t("noTeachers")}
        </div>
      )}
    </div>
  );
}
