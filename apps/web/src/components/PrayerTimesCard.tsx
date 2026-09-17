"use client";

import { useEffect, useState } from "react";
import { Clock, Moon, Sunrise, Sun, Sunset, MoonStar } from "lucide-react";

import { PRAYER_ORDER, type PrayerKey, type PrayerTimes } from "@/lib/prayer-times";
import { formatHijri } from "@/lib/hijri";

const ICONS: Record<PrayerKey, React.ReactNode> = {
  fajr: <Moon className="h-4 w-4" />,
  sunrise: <Sunrise className="h-4 w-4" />,
  dhuhr: <Sun className="h-4 w-4" />,
  asr: <Sun className="h-4 w-4" />,
  maghrib: <Sunset className="h-4 w-4" />,
  isha: <MoonStar className="h-4 w-4" />,
};

export type PrayerLabels = {
  title: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  next: string;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function PrayerTimesCard({
  times,
  timezone,
  locale,
  labels,
}: {
  times: PrayerTimes;
  timezone: string;
  locale: string;
  labels: PrayerLabels;
}) {
  // Times come pre-computed from the server (AlAdhan); only "now" (for
  // next-prayer highlighting) needs to tick on the client.
  const [state, setState] = useState<{
    hijri: string;
    nextKey: PrayerKey;
    countdown: string;
  } | null>(null);

  useEffect(() => {
    function recompute() {
      const now = new Date();

      // Minutes-since-midnight in the location's timezone.
      const nowParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);
      const nowMin = toMinutes(nowParts);

      const upcoming = PRAYER_ORDER.filter((k) => k !== "sunrise").find(
        (k) => toMinutes(times[k]) > nowMin,
      );
      const nextKey = upcoming ?? "fajr"; // after isha → tomorrow's fajr
      const targetMin = toMinutes(times[nextKey]) + (upcoming ? 0 : 24 * 60);
      const diff = targetMin - nowMin;
      const ch = Math.floor(diff / 60);
      const cm = diff % 60;

      setState({
        hijri: formatHijri(now, locale),
        nextKey,
        countdown: `${ch}h ${String(cm).padStart(2, "0")}m`,
      });
    }
    recompute();
    const id = setInterval(recompute, 30_000);
    return () => clearInterval(id);
  }, [times, timezone, locale]);

  if (!state) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-4 h-[180px] animate-pulse" />
    );
  }

  return (
    <div className="rounded-xl border border-card-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-card-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 shrink-0 text-accent" />
          <h3 className="text-sm font-semibold truncate">{labels.title}</h3>
        </div>
        <span className="shrink-0 text-xs text-muted">{state.hijri}</span>
      </div>

      <ul className="divide-y divide-card-border">
        {PRAYER_ORDER.map((key) => {
          const isNext = key === state.nextKey;
          return (
            <li
              key={key}
              className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm ${
                isNext ? "bg-accent-subtle" : ""
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={isNext ? "text-accent" : "text-muted"}>
                  {ICONS[key]}
                </span>
                <span className={isNext ? "font-semibold text-accent" : ""}>{labels[key]}</span>
                {isNext && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                    {labels.next} · {state.countdown}
                  </span>
                )}
              </span>
              <span className="tabular-nums font-medium">{times[key]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
