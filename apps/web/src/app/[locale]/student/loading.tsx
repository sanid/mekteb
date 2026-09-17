import { Skeleton, TableSkeleton } from "@/components/Skeleton";

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-8 max-w-3xl">
      <Skeleton className="h-28 rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <TableSkeleton rows={3} />
      </div>
    </div>
  );
}
