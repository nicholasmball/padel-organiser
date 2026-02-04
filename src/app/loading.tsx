import { Skeleton } from "@/components/ui/skeleton";
import { CardListSkeleton } from "@/components/ui/page-skeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>
      <Skeleton className="h-11 w-full rounded-md" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <CardListSkeleton count={2} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <CardListSkeleton count={2} />
      </div>
    </div>
  );
}
