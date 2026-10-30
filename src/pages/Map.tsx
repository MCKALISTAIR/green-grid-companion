import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRegions, getIntensityColor } from '@/lib/carbonApi';
import { UKMap } from '@/components/UKMap';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/ErrorState';
import { getErrorInfo } from '@/lib/errorUtils';
import { ErrorStateCard } from '@/components/errors/ErrorStateCard';
import { RANK_EMPTY_COPY, toneBody } from '@/lib/voice/errorStatesCopy';
import { readTone } from '@/lib/tone';

import { PullToRefresh } from '@/components/PullToRefresh';
import { Map as MapIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { pageTransition, stateTransition } from '@/lib/motion';

export default function MapPage() {
  const [showMap, setShowMap] = useState(true);
  // Only animate the map open when the user taps the toggle; on first load it must
  // appear at full height or the list below slides down (CLS ~0.3 on phones).
  const [mapToggled, setMapToggled] = useState(false);
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
    // BH-136: Rank isn't on the half-hour timer, so while it's open (and
    // visible) check every 5 min; a new half hour shows within 5 min of NESO.
    refetchInterval: 1000 * 60 * 5,
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
          <PageHeader title="Rank" className="mb-4" />
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
            title="Rank"
            actions={
              <Button
                variant={showMap ? 'default' : 'outline'}
                size="icon"
                onClick={() => {
                  setMapToggled(true);
                  setShowMap(!showMap);
                }}
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
                {/* Same box as the map frame + UKMap and the note line, so the list
                    doesn't jump down when regions load (CLS 0.1-0.3 before). */}
                {showMap && (
                  <div className="-mx-1 px-2">
                    <Skeleton
                      data-testid="rank-map-skeleton"
                      className="w-full aspect-[0.61] mx-auto mt-4 mb-12 rounded-3xl"
                    />
                  </div>
                )}
                <Skeleton className="h-4 w-3/4" />
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
                {/* Design state 5: no regional figures. Overlay the map, keep the page. */}
                {sortedRegions.length === 0 && (
                  <div className="relative" data-testid="rank-empty">
                    <div aria-hidden="true" className="pointer-events-none opacity-40">
                      <UKMap regions={[]} />
                    </div>
                    <div className="absolute inset-x-0 top-6 flex justify-center px-2">
                      <ErrorStateCard
                        className="w-full max-w-md"
                        tint="blue"
                        icon={MapIcon}
                        title={RANK_EMPTY_COPY.title}
                        body={toneBody(RANK_EMPTY_COPY.body, readTone())}
                        actions={[{ label: RANK_EMPTY_COPY.action, onClick: () => void refetch() }]}
                      />
                    </div>
                  </div>
                )}

                {/* Toggleable Map View */}
                <AnimatePresence initial={false}>
                  {showMap && sortedRegions.length > 0 && (
                    <motion.div
                      initial={mapToggled ? { height: 0, opacity: 0 } : false}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={pageTransition}
                      className="overflow-hidden -mx-1 px-2"
                      data-testid="rank-map-frame"
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

                <p data-testid="rank-estimate-note" className="text-xs text-muted-foreground">
                  NESO forecasts for this half hour. Regional figures are modelled estimates.
                </p>
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
                              <span className="capitalize font-medium text-[#0f1a24]">
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
