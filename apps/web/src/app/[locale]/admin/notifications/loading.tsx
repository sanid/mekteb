import { Skeleton, PageHeaderSkeleton } from "@/components/Skeleton";

export default function AdminNotificationsLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeaderSkeleton />
      
      {/* Notifications list */}
      <div className="rounded-xl border border-card-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 border-b border-card-border last:border-b-0"
          >
            {/* Unread indicator */}
            <Skeleton className="h-2 w-2 shrink-0 rounded-full mt-1.5" />
            
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
