"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/FormField";
import { setGroupSchedule } from "../groups/[id]/actions";

// Sun=0..Sat=6 — matches JS getDay() and the existing group detail page convention
const WEEKDAY_KEYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function GroupScheduleModal({
  group,
  initialWeekdays,
  initialStartTime,
  initialEndTime,
  onClose,
}: {
  group: { id: string; name: string };
  initialWeekdays: number[];
  initialStartTime: string;
  initialEndTime: string;
  onClose: () => void;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [weekdays, setWeekdays] = useState<number[]>(initialWeekdays);
  const [startTime, setStartTime] = useState<string>(initialStartTime);
  const [endTime, setEndTime] = useState<string>(initialEndTime);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleDay = (d: number) => {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await setGroupSchedule(group.id, weekdays, startTime, endTime);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("scheduleSaved"));
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-xl border border-card-border bg-card p-6 w-full max-w-md space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-base">
          {t("editScheduleFor", { name: group.name })}
        </h2>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted">{t("weekdays")}</div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_KEYS.map((d) => {
              const isChecked = weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`h-9 min-w-9 px-2 rounded-full text-xs font-semibold border transition-colors flex items-center justify-center cursor-pointer ${
                    isChecked
                      ? "bg-accent text-primary-foreground border-accent"
                      : "bg-background text-muted-foreground border-card-border hover:bg-accent-subtle"
                  }`}
                >
                  {t(`weekday_${d}` as "weekday_0")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="time"
            value={startTime.slice(0, 5)}
            onChange={(e) => setStartTime(e.target.value)}
            className={`${inputCls} !py-1.5 text-sm`}
          />
          <span className="text-muted text-xs">bis</span>
          <input
            type="time"
            value={endTime.slice(0, 5)}
            onChange={(e) => setEndTime(e.target.value)}
            className={`${inputCls} !py-1.5 text-sm`}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
          >
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
