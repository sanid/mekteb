import { TableSkeleton, Skeleton } from "@/components/Skeleton";

export default function ExaminerExamsLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
