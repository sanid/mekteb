import { Skeleton, PageHeaderSkeleton } from "@/components/Skeleton";

export default function TeacherGroupsLoading() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeaderSkeleton />
      
      {/* Groups list */}
      <div className="rounded-xl border border-card-border overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="block p-4 border-b border-card-border last:border-b-0 space-y-2"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}
