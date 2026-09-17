import { TableSkeleton, Skeleton } from "@/components/Skeleton";

export default function AdminParentsLoading() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      
      {/* Parents table */}
      <TableSkeleton rows={6} />
    </div>
  );
}
