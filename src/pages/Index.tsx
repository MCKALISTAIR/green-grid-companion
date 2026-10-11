import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FootprintView } from '@/components/FootprintView';
import { DemandView } from '@/components/DemandView';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useHaptics } from '@/hooks/useHaptics';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { useNotifications } from '@/hooks/useNotifications';
import { useOffline } from '@/hooks/useOffline';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useGridDemand } from '@/hooks/useGridDemand';
import { LocationMismatchPrompt } from '@/components/LocationMismatchPrompt';
import { YearWrapped } from '@/components/YearWrapped';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import { getRenewablesPercentage } from '@/lib/generationUtils';
import { useAppLocation } from '@/contexts/LocationContext';
import { useYearWrappedAutoShow } from '@/hooks/useYearWrappedAutoShow';
import { useIndexPageEffects } from '@/hooks/useIndexPageEffects';
import { useThrottledRefetch } from '@/hooks/useThrottledRefetch';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { DashboardViewTabs, type DashboardViewMode } from '@/components/home/DashboardViewTabs';
import { HomeCards, HomeCardSkeletons, type HomeCardsModel } from '@/components/home/IntensityDashboard';
import { IntensityHeroOverlay, isStaleReading, type HeroStatus } from '@/components/home/IntensityHeroOverlay';
import { ScallopDivider } from '@/components/home/ScallopDivider';
import { DayDetailSheet } from '@/components/forecast/DayDetailSheet';
import { getNowOrWaitDecision, shadedWindow } from '@/lib/nowOrWait';
import { formatLondonTime, londonDateKey, LONDON_TZ } from '@/lib/londonTime';
import { COPY } from '@/lib/homeCopy';

/** Re-render every minute so "now" (chart marker, freshness) keeps moving. */
function useNow(stepMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return now;
}

function greeting(now: Date): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TZ, hour: 'numeric', hourCycle: 'h23' }).format(now));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const Index = () => {
  const { postcode, setPostcode } = useAppLocation();
  const [viewMode, setViewMode] = useState<DashboardViewMode>('intensity');
  const { showYearWrapped, setShowYearWrapped, wrappedYear } = useYearWrappedAutoShow();
  const { selection } = useHaptics();
  const { tone } = useEnergyFacts();
  const { isOffline } = useOffline();
  const isDesktop = useIsDesktop();
  const now = useNow();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [sameNote, setSameNote] = useState<string | null>(null);

  const {
    scheduleGreenAlerts,
    scheduleDailyForecast,
    scheduleHighIntensityAlerts,
    prefs,
    isSupported: notificationsSupported,
    permissionStatus: notificationPermission,
    requestPermission: requestNotificationPermission,
    updatePreference: updateNotificationPreference,
  } = useNotifications();
  useOctopusEnergy();

  const {
    intensity,
    index,
    region,
    regionId,
    generationMix,
    gbGeneration,
    gbGenerationError,
    gbGenerationRefetch,
    gbIntensity,
    forecast,
    lastUpdated,
    slotFrom,
    slotTo,
    fetchedAt,
    isLoading,
    isBackgroundFetching,
    isDegraded,
    isError,
    refetch,
  } = useCarbonData(postcode);

  const { mix: gridMix, lastUpdated: gridTimestamp } = useGridDemand();
  const renewablesPct = getRenewablesPercentage(generationMix);

  useIndexPageEffects({
    postcode,
    intensity,
    isLoading,
    lastUpdated,
    forecast,
    refetch,
    scheduleGreenAlerts,
    scheduleDailyForecast,
    scheduleHighIntensityAlerts,
    isError,
    notificationNudge: {
      isSupported: notificationsSupported,
      permissionStatus: notificationPermission,
      alertsAlreadyOn: prefs.lowIntensityEnabled,
      requestPermission: requestNotificationPermission,
      enableCleanAlerts: () => updateNotificationPreference('lowIntensityEnabled', true),
    },
  });

  const throttledRefetch = useThrottledRefetch(refetch, {
    cooldownMs: 10_000,
    skipToastDescription: 'Grid data updates every 30 minutes — give it a sec.',
  });

  // Pull to refresh: no toast; if the half hour hasn't changed, say so inline (spec §4.9).
  const handleRefresh = async () => {
    const before = slotFrom;
    const ran = await throttledRefetch();
    if (!ran) return;
    if (before && before === slotFrom && slotTo) setSameNote(COPY.sameHalfHour(formatLondonTime(new Date(slotTo))));
  };
  useEffect(() => setSameNote(null), [slotFrom]);
  useEffect(() => {
    if (!sameNote) return;
    const id = setTimeout(() => setSameNote(null), 8000);
    return () => clearTimeout(id);
  }, [sameNote]);

  const hasReading = !isLoading && !isError;
  const stale = hasReading && isStaleReading(slotTo, now.getTime());
  const status: HeroStatus = isOffline
    ? hasReading
      ? 'offline-cached'
      : 'offline-empty'
    : isLoading
      ? 'loading'
      : isError
        ? 'error'
        : stale
          ? 'stale'
          : isBackgroundFetching
            ? 'refreshing'
            : 'ok';

  const decision = useMemo(() => getNowOrWaitDecision(hasReading ? intensity : null, forecast, now), [hasReading, intensity, forecast, now]);
  const isRegional = !!regionId;
  const regionName = region || 'GB';
  const todayKey = londonDateKey(now);
  const availableDays = useMemo(() => {
    const keys = new Set<string>();
    for (const f of forecast) {
      if (typeof f.intensity?.forecast !== 'number') continue;
      const k = londonDateKey(new Date(f.from));
      if (k >= todayKey) keys.add(k);
    }
    return [...keys].sort().slice(0, 3);
  }, [forecast, todayKey]);

  const nowInData = forecast.some((f) => Date.parse(f.from) <= now.getTime() && Date.parse(f.to) > now.getTime());
  const m: HomeCardsModel = {
    decision,
    tone,
    forecast,
    region: regionName,
    isRegional,
    intensity,
    regionalMix: generationMix,
    gbGeneration,
    gbGenerationError,
    onRetryGeneration: () => void gbGenerationRefetch(),
    gridMix,
    gridTimestamp,
    gbIntensity,
    now,
    showNowDot: !stale || nowInData,
    note: status === 'offline-cached' && slotFrom ? COPY.offlineCached(formatLondonTime(new Date(slotFrom))) : null,
    onOpenDay: setOpenDay,
  };

  const hero = (variant: 'phone' | 'card') => (
    <IntensityHeroOverlay
      postcode={postcode}
      setPostcode={setPostcode}
      region={region}
      intensity={intensity}
      index={index}
      generationMix={generationMix}
      status={status}
      renewablesPct={renewablesPct}
      slotFrom={slotFrom}
      slotTo={slotTo}
      fetchedAt={fetchedAt}
      tone={tone}
      sameHalfHourNote={sameNote}
      onRetry={() => void refetch()}
      variant={variant}
    />
  );

  const tabs = (
    <DashboardViewTabs
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSelectionHaptic={selection}
      onKeyDown={(e) => {
        const order: DashboardViewMode[] = ['intensity', 'demand', 'footprint'];
        const i = order.indexOf(viewMode);
        let n = i;
        if (e.key === 'ArrowRight') n = (i + 1) % 3;
        else if (e.key === 'ArrowLeft') n = (i + 2) % 3;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = 2;
        if (n !== i) setViewMode(order[n]);
      }}
    />
  );

  const showCards = status !== 'offline-empty' && status !== 'error';
  const cardsReady = showCards && status !== 'loading';
  const degraded = isDegraded && (
    <div className="flex items-start gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        <b>Regional data degraded.</b> We can&apos;t fetch {postcode} right now, so these are GB figures.
      </p>
    </div>
  );

  const nonIntensity = viewMode === 'demand' ? <DemandView /> : viewMode === 'footprint' ? <FootprintView /> : null;

  const content = isDesktop ? (
    <main className="home-shell px-7 py-6" data-layout="desktop">
      <h1 className="sr-only">Carbon Intensity Dashboard</h1>
      <header className="mb-5 flex items-end justify-between gap-6">
        <div>
          <p className="text-[26px] font-extrabold tracking-[-0.02em]">{greeting(now)}</p>
          <p className="text-[13px] font-semibold text-muted-foreground">
            {new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(now)} · {regionName}
          </p>
        </div>
        <div className="w-[340px]">{tabs}</div>
      </header>
      {nonIntensity ? (
        <div className="max-w-5xl">{nonIntensity}</div>
      ) : (
        <div className="grid grid-cols-[480px_minmax(0,1fr)] items-start gap-5">
          <div className="space-y-5">
            {hero('card')}
            <div className="home-feed space-y-5">
              {degraded}
              {cardsReady && <HomeCards m={m} slot="nowOrWait" />}
              {cardsReady && <HomeCards m={m} slot="explainer" />}
            </div>
          </div>
          <div className="space-y-5">
            {status === 'loading' && <HomeCardSkeletons />}
            {cardsReady && <HomeCards m={m} slot="next24" />}
            {cardsReady && <HomeCards m={m} slot="genMix" />}
            {cardsReady && <HomeCards m={m} slot="insights" />}
          </div>
        </div>
      )}
    </main>
  ) : (
    <main className="home-shell flex min-h-[100dvh] flex-col" data-layout="phone">
      <h1 className="sr-only">Carbon Intensity Dashboard</h1>
      {hero('phone')}
      <div className="home-feed relative z-10 -mt-px flex-1 bg-background px-4 pb-4 pt-1">
        <ScallopDivider className="scene-wave-divider pointer-events-none absolute inset-x-0 -top-6 h-6" />
        <div className="space-y-[14px]">
          {tabs}
          {(status === 'stale' || status === 'offline-cached') && lastUpdated && (
            <div className="flex justify-center">
              <StaleDataBadge lastUpdated={lastUpdated} />
            </div>
          )}
          {degraded}
          {nonIntensity ?? (
            <>
              {status === 'loading' && <HomeCardSkeletons />}
              {cardsReady && (
                <>
                  <HomeCards m={m} slot="nowOrWait" />
                  <HomeCards m={m} slot="next24" />
                  <HomeCards m={m} slot="explainer" />
                  <HomeCards m={m} slot="genMix" />
                  <HomeCards m={m} slot="insights" />
                </>
              )}
            </>
          )}
          {cardsReady && !nonIntensity && <p className="px-1 text-[12px] font-semibold leading-[1.4] text-muted-foreground">{COPY.credit}</p>}
        </div>
      </div>
    </main>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
          <AnimatePresence mode="wait">
            <motion.div key={isDesktop ? 'd' : 'p'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              {content}
            </motion.div>
          </AnimatePresence>
        </PullToRefresh>

        <DayDetailSheet
          dateKey={openDay}
          onDateChange={setOpenDay}
          availableDays={availableDays}
          regionId={regionId}
          regionName={regionName}
          planWindow={shadedWindow(decision.plan)}
          tone={tone}
          placeholder={forecast}
        />

        <LocationMismatchPrompt
          currentPostcode={postcode}
          onUpdate={(newPostcode) => {
            setPostcode(newPostcode);
            toast.success('Location updated to match your current region');
          }}
        />

        <YearWrapped open={showYearWrapped} onOpenChange={setShowYearWrapped} year={wrappedYear} />
      </div>
    </TooltipProvider>
  );
};

export default Index;
