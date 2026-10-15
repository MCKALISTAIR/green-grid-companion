import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRegions, getIntensityColor } from '@/lib/carbonApi';
import { UKMap } from '@/components/UKMap';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/ErrorState';
import {} from '@/components/EmptyState';
import { getErrorInfo } from '@/lib/errorUtils';

import { PullToRefresh } from '@/components/PullToRefresh';
import { Map as MapIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { pageTransition, stateTransition } from '@/lib/motion';

export default function MapPage() {
  const [showMap, setShowMap] = useState(true);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

  const {
    data: regions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['all-regions'],
    queryFn: ({ signal }) => getAllRegions(signal),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const sortedRegions = regions
    ? [...regions].sort((a, b) => a.intensity.forecast - b.intensity.forecast)
    : [];

  // Handle error state
  if (isError) {
    const errorInfo = getErrorInfo(error);
    return (
      <div className="page-shell page-shell--fit">
        <div className="page-shell-inner">
          <PageHeader title="Leaderboard" className="mb-4" />
          <ErrorState
            title={errorInfo.title}
            description={errorInfo.description}
            retry={() => refetch()}
            fullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell page-shell--fit">
      <PullToRefresh
        onRefresh={async () => {
          await refetch();
        }}
      >
        <div className="page-shell-inner space-y-4">
          <PageHeader
            title="Leaderboard"
            description="Regional carbon intensity ranking."
            actions={
              <Button
                variant={showMap ? 'default' : 'outline'}
                size="icon"
                onClick={() => setShowMap(!showMap)}
                className="rounded-full min-h-11 min-w-11 h-11 w-11 shadow-sm"
                aria-label={showMap ? 'Hide map' : 'Show map'}
                aria-pressed={showMap}
              >
                {showMap ? (
                  <X className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <MapIcon className="w-5 h-5" aria-hidden="true" />
                )}
              </Button>
            }
          />

          <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={stateTransition}
                className="space-y-3"
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="sheet-surface p-4 flex items-center justify-between">
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="w-12 h-6 rounded-full" />
                  </Card>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={stateTransition}
                className="space-y-6"
              >
                {/* Toggleable Map View */}
                <AnimatePresence initial={false}>
                  {showMap && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={pageTransition}
                      className="overflow-hidden"
                    >
                      <UKMap
                        regions={regions || []}
                        selectedRegionId={selectedRegionId || undefined}
                        onRegionSelect={(id) => {
                          setSelectedRegionId(id);
                          const element = document.getElementById(`region-card-${id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid gap-3">
                  {sortedRegions.map((region, idx) => (
                    <div
                      key={region.regionid}
                      id={`region-card-${region.regionid}`}
                      className="scroll-mt-4"
                    >
                      <Card
                        className={cn(
                          'sheet-surface p-4 flex items-center justify-between transition-all duration-350 cursor-pointer active:scale-[0.99]',
                          selectedRegionId === region.regionid
                            ? 'ring-2 ring-primary bg-primary/10 border-primary/30 scale-[1.015]'
                            : 'hover:bg-card/80',
                        )}
                        onClick={() => setSelectedRegionId(region.regionid)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx === 0
                                ? 'bg-primary/15 text-primary'
                                : idx === 1
                                  ? 'bg-muted text-foreground'
                                  : idx === 2
                                    ? 'bg-accent/20 text-accent-foreground'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{region.shortname}</h3>
                            <div
                              className={`text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-full mt-0.5 ${getIntensityColor(region.intensity.index)} bg-opacity-20`}
                            >
                              <span className="capitalize font-medium text-foreground">
                                {region.intensity.index}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-bold font-mono tabular-nums">
                            {region.intensity.forecast}
                          </div>
                          <div className="text-[10px] text-muted-foreground">gCO₂/kWh</div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PullToRefresh>
    </div>
  );
}
