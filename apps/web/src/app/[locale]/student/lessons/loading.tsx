import { Skeleton, PageHeaderSkeleton } from "@/components/Skeleton";

export default function StudentLessonsLoading() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeaderSkeleton />
      
      {/* Topic sections */}
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, topicIndex) => (
          <section key={topicIndex} className="space-y-3">
            {/* Topic header */}
            <Skeleton className="h-5 w-32" />
            
            {/* Lessons list */}
            <div className="rounded-xl border border-card-border overflow-hidden">
              {Array.from({ length: 3 }).map((_, lessonIndex) => (
                <div
                  key={lessonIndex}
                  className="flex items-start justify-between gap-3 px-4 py-3 border-b border-card-border last:border-b-0"
                >
                  <div className="min-w-0 space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
