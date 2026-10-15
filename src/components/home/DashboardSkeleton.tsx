import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder that mirrors IntensityDashboard’s quiet sheet (tabs → decision →
 * mix → forecast). Keeping height close to the loaded view avoids a large
 * skeleton→content layout shift on first paint.
 */
export function DashboardSkeleton() {
  return (
    /* min-h matches a typical Intensity dashboard (~877px on a 390×844 phone)
       so skeleton→content does not grow/shrink the feed and score as CLS. */
    <div className="space-y-4 min-h-[54.8rem]" aria-hidden>
      <div className="flex p-1 bg-muted rounded-lg w-full h-10">
        <Skeleton className="flex-1 h-full rounded-md" />
        <Skeleton className="flex-1 h-full rounded-md ml-2" />
        <Skeleton className="flex-1 h-full rounded-md ml-2" />
      </div>

      <div className="space-y-5">
        <div className="sheet-surface p-4 space-y-3">
          <Skeleton className="h-4 w-1/3 rounded-md" />
          <Skeleton className="h-8 w-2/3 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
        </div>

        <div className="sheet-surface px-3 py-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-3 w-12 rounded-md" />
          </div>
          <div className="space-y-2.5 px-1">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-5/6 rounded-full" />
            <Skeleton className="h-3 w-4/6 rounded-full" />
            <Skeleton className="h-3 w-3/6 rounded-full" />
          </div>
        </div>

        <div className="sheet-surface p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
