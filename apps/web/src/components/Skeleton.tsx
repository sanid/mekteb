export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface ${className}`}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-card-border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border-b border-card-border last:border-b-0"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-1/4" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 border-b border-card-border pb-5">
      <Skeleton className="h-3 w-40" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

export function DetailPageSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeaderSkeleton />
      {Array.from({ length: sections }).map((_, i) => (
        <section key={i} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <TableSkeleton rows={4} />
        </section>
      ))}
    </div>
  );
}
