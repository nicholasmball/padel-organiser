import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, CardListSkeleton } from "@/components/ui/page-skeleton";

export default function MyGamesLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-8 w-32" />
      <StatsSkeleton />
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <CardListSkeleton count={2} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <CardListSkeleton count={2} />
      </div>
    </div>
  );
}
