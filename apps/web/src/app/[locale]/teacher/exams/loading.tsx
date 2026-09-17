import { Skeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/Skeleton";

export default function TeacherExamsLoading() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeaderSkeleton />
      
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-card-border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-1/4" />
          </div>
        ))}
      </div>
      
      {/* Exams table */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <TableSkeleton rows={6} />
      </div>
    </div>
  );
}
