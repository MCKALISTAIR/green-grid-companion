import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex p-1 bg-muted rounded-lg w-full h-10 mb-2">
        <Skeleton className="flex-1 h-full rounded-md" />
        <Skeleton className="flex-1 h-full rounded-md ml-2" />
        <Skeleton className="flex-1 h-full rounded-md ml-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-lg flex flex-col justify-between h-[220px]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-1/3 rounded-md" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-xl mt-4" />
        </Card>

        <Card className="p-5 shadow-lg md:col-span-2 lg:col-span-2 flex flex-col justify-between h-[220px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/4 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-3 flex-1 rounded-full" />
                <Skeleton className="h-4 w-8 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-3 flex-1 rounded-full" />
                <Skeleton className="h-4 w-8 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-3 flex-1 rounded-full" />
                <Skeleton className="h-4 w-8 rounded-md" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-lg flex flex-col justify-between h-[150px]">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-8 w-2/3 rounded-md" />
          </div>
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </Card>

        <Card className="p-5 shadow-lg flex flex-col justify-between h-[150px]">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-8 w-2/3 rounded-md" />
          </div>
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </Card>

        <Card className="p-5 shadow-lg md:col-span-2 lg:col-span-3 h-[280px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/6 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-12 rounded-md" />
              <Skeleton className="h-7 w-12 rounded-md" />
            </div>
          </div>
          <div className="flex items-end justify-between h-40 px-2 pt-4">
            <Skeleton className="h-[20%] w-6 rounded-t-sm" />
            <Skeleton className="h-[40%] w-6 rounded-t-sm" />
            <Skeleton className="h-[60%] w-6 rounded-t-sm" />
            <Skeleton className="h-[80%] w-6 rounded-t-sm" />
            <Skeleton className="h-[90%] w-6 rounded-t-sm" />
            <Skeleton className="h-[70%] w-6 rounded-t-sm" />
            <Skeleton className="h-[50%] w-6 rounded-t-sm" />
            <Skeleton className="h-[30%] w-6 rounded-t-sm" />
            <Skeleton className="h-[20%] w-6 rounded-t-sm" />
            <Skeleton className="h-[40%] w-6 rounded-t-sm" />
            <Skeleton className="h-[60%] w-6 rounded-t-sm" />
            <Skeleton className="h-[75%] w-6 rounded-t-sm" />
          </div>
        </Card>
      </div>
    </div>
  );
}
