import { Skeleton } from "@/components/ui/skeleton";
import { CardListSkeleton } from "@/components/ui/page-skeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>
      {/* Hero card skeleton */}
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <CardListSkeleton count={2} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-40 min-w-[280px] rounded-lg" />
          <Skeleton className="h-40 min-w-[280px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}
