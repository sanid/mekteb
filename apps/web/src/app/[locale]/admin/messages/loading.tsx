import { Skeleton } from "@/components/Skeleton";

export default function AdminMessagesLoading() {
  return (
    <>
      {/* Mobile thread list */}
      <div className="md:hidden flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        
        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 border-b border-card-border/50"
            >
              {/* Avatar */}
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              
              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-baseline justify-between gap-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop empty state placeholder */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 space-y-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </>
  );
}
