import { AlertTriangle, ChevronDown, Info, Leaf, MapPin, RefreshCw, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationManager } from '@/components/LocationManager';
import { AnimatedIntensity } from '@/components/AnimatedIntensity';
import { TypewriterText } from '@/components/TypewriterText';
import { RenewableSparkle } from '@/components/RenewableSparkle';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { IntensityScene } from '@/components/IntensityScene';
import { DEFINITIONS } from '@/lib/definitions';
import type { GenerationMix } from '@/lib/carbonApi';

interface IntensityHeroOverlayProps {
  postcode: string;
  setPostcode: (value: string) => void;
  region: string | undefined;
  intensity: number;
  previousIntensity: number | null | undefined;
  index: string;
  generationMix: GenerationMix[] | undefined;
  isLoading: boolean;
  isBackgroundFetching: boolean;
  isError: boolean;
  lastUpdated: string | null | undefined;
  nextUpdate: string | Date | null | undefined;
  getNextUpdate: (lastUpdated?: string) => Date | null;
  relativeTime: string;
  freshnessColor: string;
  renewablesPct: number;
  sparkleTrigger: boolean;
  onSparkleComplete: () => void;
  hideGauge: boolean;
}

export function IntensityHeroOverlay({
  postcode,
  setPostcode,
  region,
  intensity,
  previousIntensity,
  index,
  generationMix,
  isLoading,
  isBackgroundFetching,
  isError,
  lastUpdated,
  nextUpdate,
  getNextUpdate,
  relativeTime,
  freshnessColor,
  renewablesPct,
  sparkleTrigger,
  onSparkleComplete,
  hideGauge,
}: IntensityHeroOverlayProps) {
  return (
    <div className="relative w-full h-[60vh] min-h-[400px]">
      <ComponentErrorBoundary name="Scene">
        <IntensityScene
          intensity={intensity}
          index={index}
          generationMix={generationMix}
          className="h-full"
          style={{ height: '100%' }}
        />

        <div className="absolute top-6 left-6 z-30 hidden lg:block">
          <LocationManager
            value={postcode}
            onChange={setPostcode}
            trigger={
              <button className="flex items-center gap-2 text-white/90 text-sm font-medium uppercase tracking-wide transition-all cursor-pointer bg-black/20 hover:bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:border-white/20 shadow-sm group">
                <MapPin className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Loading...' : region || 'Select location'}</span>
                {isBackgroundFetching ? (
                  <RefreshCw className="w-3 h-3 animate-spin opacity-70" />
                ) : (
                  <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            }
          />
        </div>

        <div className="absolute top-[calc(max(env(safe-area-inset-top),24px)+0.5rem)] right-4 z-30 lg:top-6 lg:right-6">
          <Link to="/achievements">
            <button
              className="flex items-center justify-center text-white/90 transition-all cursor-pointer bg-black/20 hover:bg-black/30 active:scale-95 hover:scale-105 backdrop-blur-md p-2.5 rounded-full border border-white/10 hover:border-white/20 shadow-sm"
              aria-label="Trophy Room"
            >
              <Trophy className="w-4 h-4 text-yellow-400 dark:text-yellow-300" />
            </button>
          </Link>
        </div>
      </ComponentErrorBoundary>

      {!hideGauge && (
        <div
          className="absolute top-[calc(max(env(safe-area-inset-top),59px)+1rem)] left-1/2 -translate-x-1/2 text-center w-auto max-w-[90%] z-10"
          data-tour="intensity-gauge"
        >
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="lg:hidden">
                <LocationManager
                  value={postcode}
                  onChange={setPostcode}
                  trigger={
                    <button className="flex items-center gap-1.5 text-card/90 text-sm font-medium uppercase tracking-wide hover:text-card transition-colors cursor-pointer group">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Loading...' : region || 'Select location'}</span>
                      {isBackgroundFetching ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin opacity-75" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  }
                />
              </div>
              {!isLoading && region && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full p-0 hover:bg-transparent"
                      aria-label="More info about Carbon Intensity"
                    >
                      <Info className="w-3.5 h-3.5 text-card/70 cursor-help" aria-hidden="true" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-3 text-xs bg-card border-border backdrop-blur-xl">
                    <p>{DEFINITIONS['Carbon Intensity']}</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="flex items-baseline justify-center gap-2">
              {isLoading ? (
                <RefreshCw className="w-10 h-10 text-card animate-spin" aria-label="Loading data" />
              ) : isError ? (
                <div className="flex flex-col items-center py-1">
                  <AlertTriangle className="w-8 h-8 text-white/95 animate-pulse mb-1" />
                  <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Offline</span>
                </div>
              ) : (
                <>
                  <AnimatedIntensity
                    value={intensity}
                    previousValue={previousIntensity}
                    isUpdating={isBackgroundFetching}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-card/90 text-lg font-medium">gCO₂/kWh</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full p-0 hover:bg-transparent"
                          aria-label="More info about gCO2/kWh"
                        >
                          <Info className="w-4 h-4 text-card/70 cursor-help" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[240px] p-3 text-xs bg-card border-border backdrop-blur-xl">
                        <p>{DEFINITIONS['gCO2/kWh']}</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>

            {!isLoading && !isError && (
              <div className="flex flex-col items-center mt-2 gap-2">
                <motion.div
                  key={index}
                  className="inline-block px-3 py-1 rounded-full bg-white/40 shadow-sm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-lg font-semibold capitalize text-card">
                    <TypewriterText text={index} />
                  </p>
                </motion.div>

                <div className="relative">
                  <motion.div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
                    style={{
                      backgroundColor:
                        renewablesPct >= 70
                          ? 'rgba(74, 222, 128, 0.35)'
                          : renewablesPct >= 50
                            ? 'rgba(163, 230, 53, 0.30)'
                            : renewablesPct >= 30
                              ? 'rgba(250, 204, 21, 0.30)'
                              : 'rgba(251, 146, 60, 0.25)',
                      color:
                        renewablesPct >= 70
                          ? '#16a34a'
                          : renewablesPct >= 50
                            ? '#4d7c0f'
                            : renewablesPct >= 30
                              ? '#854d0e'
                              : '#9a3412',
                      backdropFilter: 'blur(4px)',
                    }}
                    key={Math.round(renewablesPct / 10)}
                    animate={{ scale: [1, 1.07, 1] }}
                    transition={{ duration: 0.4, ease: 'easeOut' as const }}
                  >
                    <Leaf className="w-3 h-3" aria-hidden="true" />
                    {renewablesPct.toFixed(0)}% Renewable
                  </motion.div>
                  <RenewableSparkle trigger={sparkleTrigger} onComplete={onSparkleComplete} />
                </div>
              </div>
            )}

            {!isLoading && lastUpdated && (
              <div className="flex flex-col items-center mt-2 gap-1.5">
                <div className="flex items-center gap-1.5 text-xs text-card/80 font-medium bg-white/20 px-2 py-0.5 rounded-md">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${freshnessColor}`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${freshnessColor}`} />
                  </span>
                  <span>{relativeTime}</span>
                  <span>•</span>
                  <span>
                    {(() => {
                      if (nextUpdate) {
                        const next = new Date(nextUpdate);
                        const now = new Date();
                        if (now > next) return 'Update Due';
                        return `Next ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} `;
                      }
                      const next = getNextUpdate(lastUpdated);
                      if (!next) return '';
                      return `Next ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} `;
                    })()}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 rounded-full p-0 hover:bg-transparent ml-0.5"
                        aria-label="More information about data refresh schedule"
                      >
                        <Info className="w-3 h-3 text-card/70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-3 text-xs bg-card border-border backdrop-blur-xl">
                      <p className="font-semibold mb-1">Data Refresh Schedule</p>
                      <p>
                        Data is sourced directly from the National Grid ESO. They publish new carbon intensity figures
                        every <span className="font-bold">30 minutes</span>.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <StaleDataBadge lastUpdated={lastUpdated} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
