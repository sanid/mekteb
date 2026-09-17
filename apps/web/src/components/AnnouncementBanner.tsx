"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";

type BannerAnnouncement = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  published_at: string | null;
};

export default function AnnouncementBanner({ mosqueId }: { mosqueId: string }) {
  const [announcements, setAnnouncements] = useState<BannerAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, created_at, published_at")
        .eq("mosque_id", mosqueId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsVisible(false);
        setIsLoaded(true);
        return;
      }

      // Check if dismissed
      const newestId = data[0].id;
      const dismissedId = localStorage.getItem("dismissed_announcement_id");
      if (dismissedId === newestId) {
        setIsVisible(false);
      } else {
        setAnnouncements(data);
        setIsVisible(true);
      }
      setIsLoaded(true);
    }
    load();
  }, [mosqueId, supabase]);

  // Auto-rotate every 5 seconds if there are multiple
  useEffect(() => {
    if (announcements.length <= 1 || !isVisible) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements, isVisible]);

  if (!isLoaded || !isVisible || announcements.length === 0) return null;

  const current = announcements[currentIndex];

  const handleDismiss = () => {
    const newestId = announcements[0].id;
    localStorage.setItem("dismissed_announcement_id", newestId);
    setIsVisible(false);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  return (
    <div className="bg-accent-subtle text-foreground border-b border-accent/20 px-4 py-2.5 flex items-center justify-between gap-4 text-sm transition-all duration-300 relative">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Megaphone className="h-4 w-4 shrink-0 text-accent" />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <span className="font-semibold shrink-0">{current.title}:</span>
          <span className="truncate text-muted">{current.body}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {announcements.length > 1 && (
          <div className="flex items-center gap-1 bg-card/60 rounded-lg p-0.5 mr-1 border border-card-border">
            <button
              onClick={handlePrev}
              className="p-1 hover:bg-accent/10 rounded cursor-pointer transition-colors"
              aria-label="Previous announcement"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] px-1 select-none tabular-nums text-muted">
              {currentIndex + 1}/{announcements.length}
            </span>
            <button
              onClick={handleNext}
              className="p-1 hover:bg-accent/10 rounded cursor-pointer transition-colors"
              aria-label="Next announcement"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-accent/10 rounded-lg cursor-pointer transition-colors"
          aria-label="Dismiss announcements"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
