import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Leaf,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  Award,
  Target,
  Trophy,
  Sparkles,
  Clock,
  Sun,
  Moon,
  Star,
  Info,
  Car,
  Smartphone,
  Trees,
  Coffee,
  SunMedium,
  AlertCircle,
  X,
} from 'lucide-react';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import { formatDistanceToNow } from 'date-fns';
import { getImpactEquivalents } from '@/lib/impact-conversions';
import { useSettings } from '@/hooks/useSettings';
import { getAverageDailyKwh, getHouseTypeLabel } from '@/lib/energy-standards';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { useAchievements } from '@/hooks/useAchievements';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useAppLocation } from '@/contexts/LocationContext';
import { estimateDailyCarbonGrams, formatEstimatedKg } from '@/lib/estimatedFootprint';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { format, parseISO, startOfDay, getHours } from 'date-fns';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { EstimateDisclaimer } from '@/components/attribution/EstimateDisclaimer';
import { GreenScoreExplainerContent } from '@/components/GreenScoreExplainer';
import { getGreenScoreRating } from '@/lib/greenScore';
import { OctopusReferralLine } from '@/components/OctopusReferralLine';

const INTENSITY_COLORS: Record<string, string> = {
  'very low': 'hsl(var(--intensity-very-low))',
  low: 'hsl(var(--intensity-low))',
  moderate: 'hsl(var(--intensity-moderate))',
  high: 'hsl(var(--intensity-high))',
  'very high': 'hsl(var(--intensity-very-high))',
};

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  color: string;
}

export type TimeRange = 'day' | 'week' | 'month' | 'year';

export function FootprintView() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [selectedDate] = useState<Date | null>(null);
  const { houseType, customAnnualKwh } = useSettings();
  const [showScoreTip, setShowScoreTip] = useState(
    () => !localStorage.getItem('green-score-tip-seen'),
  );

  const dismissScoreTip = () => {
    setShowScoreTip(false);
    localStorage.setItem('green-score-tip-seen', 'true');
  };

  // Fetch more data (60 days) to ensure we have historical data available
  // The UI will filter to show the appropriate range based on selectedDate and timeRange
  const daysToFetch = 60;

  const {
    footprint,
    isLoading,
    statusLoading,
    isLinked,
    status,
    isSyncing,
    fullSync,
    isError,
    refetchFootprint,
    availableDates,
    hasCredentials,
  } = useOctopusEnergy(daysToFetch);
  const { achievements: globalAchievements, unlock } = useAchievements();
  const { postcode } = useAppLocation();
  const { intensity, index: intensityIndex } = useCarbonData(postcode);

  const estimatedDailyGrams = useMemo(
    () => estimateDailyCarbonGrams(intensity || 0, houseType, customAnnualKwh),
    [intensity, houseType, customAnnualKwh],
  );
  const estimatedDailyKwh = getAverageDailyKwh(houseType, customAnnualKwh);

  // Determine the date range to show based on selectedDate
  const effectiveDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    // Default to most recent available data date
    if (availableDates?.maxDate) {
      return startOfDay(parseISO(availableDates.maxDate));
    }
    // Fallback to today
    return new Date();
  }, [selectedDate, availableDates]);

  // Aggregate data based on time range and selected date
  const dailyData = useMemo(() => {
    if (!footprint?.records?.length) return [];

    // Filter records based on selected date and time range
    let filteredRecords = footprint.records;

    if (timeRange === 'day') {
      // Show only data for the selected day
      const dayStart = startOfDay(effectiveDate);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      filteredRecords = footprint.records.filter((record) => {
        const recordDate = parseISO(record.interval_start);
        return recordDate >= dayStart && recordDate < dayEnd;
      });
    } else if (timeRange === 'week') {
      // Show 7 days starting from selected date
      const weekStart = startOfDay(effectiveDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      filteredRecords = footprint.records.filter((record) => {
        const recordDate = parseISO(record.interval_start);
        return recordDate >= weekStart && recordDate < weekEnd;
      });
    }
    // For month and year, use all available data (no filtering needed)

    const aggregated: Record<string, { carbon_kg: number; kwh: number; date: Date }> = {};

    for (const record of filteredRecords) {
      let key: string;
      let date: Date;

      // Aggregation strategy
      if (timeRange === 'day') {
        // Keep hourly data
        date = parseISO(record.interval_start);
        // Key by hour
        key = format(date, 'yyyy-MM-dd HH:00');
      } else if (timeRange === 'year') {
        // Aggregate by month
        date = startOfDay(parseISO(record.interval_start));
        // Set to 1st of month for grouping
        date.setDate(1);
        key = format(date, 'yyyy-MM');
      } else {
        // Default: Aggregate by day (Week/Month views)
        date = startOfDay(parseISO(record.interval_start));
        key = date.toISOString();
      }

      if (!aggregated[key]) {
        aggregated[key] = { carbon_kg: 0, kwh: 0, date };
      }
      aggregated[key].carbon_kg += Number(record.carbon_g) / 1000;
      aggregated[key].kwh += Number(record.consumption_kwh);
    }

    return Object.values(aggregated)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((d) => {
        let dateParams = '';
        if (timeRange === 'day') dateParams = 'HH:mm';
        else if (timeRange === 'year') dateParams = 'MMM';
        else dateParams = 'MMM d';

        return {
          date: format(d.date, dateParams),
          fullDate: d.date, // Keep full date for sorting/logic if needed
          carbon_kg: Number(d.carbon_kg.toFixed(2)),
          kwh: Number(d.kwh.toFixed(2)),
        };
      });
  }, [footprint, timeRange, effectiveDate]);

  // Calculate insights
  const insights = useMemo(() => {
    if (!footprint?.summary) return null;

    const { by_intensity_index, total_kwh, total_carbon_kg } = footprint.summary;
    const hasExport = footprint.summary.has_export_meter ?? false;
    const exportKwh = footprint.summary.export_kwh ?? 0;
    const exportCarbonKg = footprint.summary.export_carbon_kg ?? 0;
    const netCarbonKg = footprint.summary.net_carbon_kg ?? total_carbon_kg;

    // Calculate green vs dirty usage
    const greenKwh =
      (by_intensity_index['very low']?.kwh || 0) + (by_intensity_index['low']?.kwh || 0);
    const dirtyKwh =
      (by_intensity_index['high']?.kwh || 0) + (by_intensity_index['very high']?.kwh || 0);
    const greenPercentage = total_kwh > 0 ? (greenKwh / total_kwh) * 100 : 0;
    const veryLowPercentage =
      total_kwh > 0 ? ((by_intensity_index['very low']?.kwh || 0) / total_kwh) * 100 : 0;

    // Average intensity
    const avgIntensity = footprint.summary.avg_intensity;

    // Potential savings (if all usage was at "very low" ~50g)
    const optimalCarbon = (total_kwh * 50) / 1000;
    const potentialSavings = total_carbon_kg - optimalCarbon;

    // Actual Savings (compared to average intensity for the period)
    const averageUserCarbon = (total_kwh * avgIntensity) / 1000;
    const carbonSaved = Math.max(0, averageUserCarbon - total_carbon_kg);

    const impact = getImpactEquivalents(carbonSaved);

    // Household Comparison
    const benchmarkDaily = getAverageDailyKwh(houseType, customAnnualKwh);
    // Calculate actual days in the period based on filtered data
    const actualDays =
      dailyData.length > 0
        ? dailyData.length
        : timeRange === 'day'
          ? 1
          : timeRange === 'week'
            ? 7
            : timeRange === 'month'
              ? 31
              : 365;
    const benchmarkTotal = benchmarkDaily * actualDays;
    const comparisonDiff = total_kwh - benchmarkTotal;
    const comparisonPercent = benchmarkTotal > 0 ? (comparisonDiff / benchmarkTotal) * 100 : 0;
    const isEfficient = comparisonDiff < 0;

    // Best period calculation
    const dataPoints = dailyData.map((d) => ({ date: d.date, carbon: d.carbon_kg, kwh: d.kwh }));
    const bestPeriod =
      dataPoints.length > 0
        ? dataPoints.reduce((min, d) => (d.carbon < min.carbon ? d : min), dataPoints[0])
        : null;

    // Time of day analysis - More granular periods
    const hourlyUsage: Record<string, number> = {};
    for (const record of footprint.records || []) {
      const hour = getHours(parseISO(record.interval_start));
      const period =
        hour >= 22 || hour < 2
          ? 'late evening'
          : hour >= 2 && hour < 6
            ? 'early morning'
            : hour >= 6 && hour < 10
              ? 'morning'
              : hour >= 10 && hour < 16
                ? 'midday'
                : hour >= 16 && hour < 19
                  ? 'evening peak'
                  : 'evening';
      hourlyUsage[period] = (hourlyUsage[period] || 0) + Number(record.consumption_kwh);
    }
    const peakPeriod = Object.entries(hourlyUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    return {
      greenPercentage,
      veryLowPercentage,
      dirtyKwh,
      avgIntensity,
      potentialSavings,
      carbonSaved,
      impact,
      comparison: {
        diff: comparisonDiff,
        percent: Math.abs(comparisonPercent),
        isEfficient,
        benchmark: benchmarkTotal,
      },
      totalCarbon: total_carbon_kg,
      totalKwh: total_kwh,
      bestPeriod,
      peakPeriod,
      recordCount: footprint.records?.length || 0,
      // Export/net
      hasExport,
      exportKwh,
      exportCarbonKg,
      netCarbonKg,
    };
  }, [footprint, dailyData, customAnnualKwh, houseType, timeRange]);

  // Check and unlock achievements based on insights
  useMemo(() => {
    if (!insights) return;

    if (insights.greenPercentage >= 50) unlock('green_majority');
    if (insights.greenPercentage >= 70) unlock('eco_champion');
    if (insights.veryLowPercentage >= 30) unlock('ultra_green');
    if (insights.bestPeriod && insights.bestPeriod.carbon < 1) unlock('low_carbon_day');
    if (insights.recordCount >= 100) unlock('data_tracker');
  }, [insights, unlock]);

  // Generate achievements list merging local definitions with global unlock state
  const achievementsList = useMemo((): Achievement[] => {
    // Helper to find global status
    const isUnlocked = (id: string) =>
      globalAchievements.find((a) => a.id === id)?.unlocked ?? false;

    return [
      {
        id: 'green_majority',
        title: 'Green Majority',
        description: 'Used 50%+ of your power in low-carbon times, in one period',
        icon: <Leaf className="w-5 h-5" />,
        unlocked: isUnlocked('green_majority'),
        color: 'green',
      },
      {
        id: 'eco_champion',
        title: 'Eco Champion',
        description: 'Used 70%+ of your power in low-carbon times, in one period',
        icon: <Trophy className="w-5 h-5" />,
        unlocked: isUnlocked('eco_champion'),
        color: 'emerald',
      },
      {
        id: 'ultra_green',
        title: 'Ultra Green',
        description: '30%+ at very low intensity',
        icon: <Sparkles className="w-5 h-5" />,
        unlocked: isUnlocked('ultra_green'),
        color: 'teal',
      },
      {
        id: 'low_carbon_day',
        title: 'Low Carbon Zone',
        description: 'Have a period under 1kg CO₂',
        icon: <Star className="w-5 h-5" />,
        unlocked: isUnlocked('low_carbon_day'),
        color: 'yellow',
      },
      {
        id: 'data_tracker',
        title: 'Data Tracker',
        description: 'Tracked 100+ readings',
        icon: <Clock className="w-5 h-5" />,
        unlocked: isUnlocked('data_tracker'),
        color: 'blue',
      },
    ];
  }, [globalAchievements]);

  // Intensity breakdown for bar chart
  const intensityBreakdown = useMemo(() => {
    if (!footprint?.summary?.by_intensity_index) return [];

    const order = ['very low', 'low', 'moderate', 'high', 'very high'];
    return order
      .filter((idx) => footprint.summary.by_intensity_index[idx])
      .map((idx) => ({
        name: idx.charAt(0).toUpperCase() + idx.slice(1),
        kwh: Number(footprint.summary.by_intensity_index[idx].kwh.toFixed(1)),
        carbon: Number((footprint.summary.by_intensity_index[idx].carbon_g / 1000).toFixed(2)),
        index: idx,
      }));
  }, [footprint]);

  // Wait for Octopus status before painting the unlinked CTA (avoids mid-load flash).
  if (statusLoading && !isLinked) {
    return (
      <div className="space-y-4 min-h-[50vh] animate-in fade-in duration-200">
        <Card className="p-6 animate-pulse bg-card">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-muted rounded"></div>
        </Card>
        <Card className="p-6 animate-pulse bg-card">
          <div className="h-4 bg-muted rounded w-1/4 mb-3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </Card>
      </div>
    );
  }

  if (!isLinked) {
    return (
      <div className="space-y-6 pt-2 pb-8 max-w-2xl mx-auto animate-in fade-in duration-200">
        <Card className="p-6 space-y-4 border-primary/20 bg-primary/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="secondary" className="mb-2">
                Estimated
              </Badge>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Your household benchmark
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Based on {getHouseTypeLabel(houseType)} typical usage and the current grid intensity
                {intensity ? ` (${intensity}g CO₂/kWh · ${intensityIndex})` : ''}. It&apos;s a rough
                Ofgem benchmark, not your actual usage. Link Octopus to get a Green Score.{' '}
                <button
                  type="button"
                  className="underline text-primary hover:text-primary/80 font-medium"
                  onClick={() => navigate('/settings')}
                >
                  Change home size
                </button>
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Leaf className="w-6 h-6 text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Est. daily usage</p>
              <p className="text-2xl font-semibold font-mono tabular-nums">
                {estimatedDailyKwh.toFixed(1)} kWh
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Est. daily CO₂</p>
              <p className="text-2xl font-semibold font-mono tabular-nums">
                {intensity ? `${formatEstimatedKg(estimatedDailyGrams)} kg` : 'n/a'}
              </p>
            </div>
          </div>

          <EstimateDisclaimer />

          {hasCredentials && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
              Your Octopus details are saved, but no meter is linked yet. Open Settings to finish.
            </div>
          )}
        </Card>

        <Card className="p-8 text-center space-y-6">
          <div className="space-y-3">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Unlock your real footprint
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Link Octopus and we&apos;ll multiply your real half-hourly usage by the grid&apos;s
              carbon intensity, then give you a Green Score for how well you time it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-xl mx-auto py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Leaf className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Daily Emissions</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Sun className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Solar Impact</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Green Score</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <Button
              size="lg"
              className="w-full max-w-sm font-semibold text-lg h-12"
              onClick={() => navigate('/settings')}
            >
              <Zap className="w-5 h-5 mr-2" />
              {hasCredentials ? 'Finish linking' : 'Link Octopus Account'}
            </Button>

            <OctopusReferralLine className="text-sm" />

            <p className="text-xs text-muted-foreground pt-2 max-w-sm">
              Your Octopus API key is stored encrypted on our servers, never on your device. We use
              it only to fetch your meter data.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 min-h-[50vh] animate-in fade-in duration-200">
        <Card className="p-6 animate-pulse bg-card">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-muted rounded"></div>
        </Card>
        <Card className="p-6 animate-pulse bg-card">
          <div className="h-4 bg-muted rounded w-1/4 mb-3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-6 text-center animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-semibold">Couldn&apos;t load your footprint</h3>
          <p className="text-sm text-muted-foreground">
            Something went wrong getting your carbon data. Check your connection and try again.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchFootprint()} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-200">
      {/* Time Range Selector & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            My Footprint
          </h2>
          <p className="text-sm text-muted-foreground">Track your carbon impact over time</p>
        </div>
        <Tabs
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as TimeRange)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-4 sm:w-auto">
            <TabsTrigger value="day" className="text-xs px-3">
              Day
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-3">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-3">
              Month
            </TabsTrigger>
            <TabsTrigger value="year" className="text-xs px-3">
              Year
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Date Indicator - show which date is being viewed */}
      {(timeRange === 'day' || timeRange === 'week') && availableDates?.maxDate && (
        <div className="text-sm text-muted-foreground">
          {timeRange === 'day'
            ? `Showing: ${format(effectiveDate, 'EEEE d MMMM yyyy')}`
            : `Showing: ${format(effectiveDate, 'MMM d')} to ${format(new Date(effectiveDate.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')}`}
        </div>
      )}

      {showScoreTip && insights && (
        <Card className="p-4 bg-primary/5 border-primary/20 border-dashed relative">
          <button
            type="button"
            onClick={dismissScoreTip}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss Green Score tip"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex gap-3 pr-6">
            <div className="p-2 rounded-full bg-primary/10 h-fit shrink-0">
              <Award className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Your Green Score is live</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                It&apos;s currently{' '}
                <strong className="text-foreground">{insights.greenPercentage.toFixed(0)}%</strong>{' '}
                ({getGreenScoreRating(insights.greenPercentage)}). This measures <em>when</em> you
                used power, not just how much. Open History to see yellow usage bars against dirty
                intensity spikes.
              </p>
              <GreenScoreExplainerContent />
            </div>
          </div>
        </Card>
      )}

      {!dailyData.length ? (
        <Card className="p-6">
          <div className="text-center mb-4">
            <Leaf className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">
              No Footprint Data
              {timeRange === 'day' && selectedDate ? ` for ${format(selectedDate, 'PPP')}` : ''}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              {timeRange === 'day' && selectedDate
                ? `Nothing for ${format(selectedDate, 'PPP')} yet. Smart meter data usually takes 24-48 hours to come through.`
                : timeRange === 'day' && availableDates?.maxDate
                  ? `Showing your latest data, from ${format(parseISO(availableDates.maxDate), 'PPP')}. Today's should arrive in 24-48 hours.`
                  : !status?.latest_consumption
                    ? 'Waiting for your readings from Octopus. They can take 24-48 hours to show up after linking.'
                    : footprint?.records?.length
                      ? 'Nothing in these dates. Try an earlier one.'
                      : 'Sync your usage to see your carbon footprint.'}
            </p>
          </div>

          {/* Meter sync details */}
          {status?.meters && status.meters.length > 0 && (
            <div className="border-t border-border pt-4 mt-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Linked Meters
              </h4>
              {status.meters.map((meter) => (
                <div
                  key={meter.mpan}
                  className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="text-foreground font-medium">
                      MPAN: ...{meter.mpan.slice(-6)}
                    </span>
                    {meter.meter_type === 'export' && (
                      <Badge
                        variant="outline"
                        className="ml-1.5 text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/20"
                      >
                        Export
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {meter.last_sync_at
                      ? `Synced ${formatDistanceToNow(new Date(meter.last_sync_at), { addSuffix: true })}`
                      : 'Never synced'}
                  </span>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => fullSync()}
                disabled={isSyncing}
                className="w-full mt-2"
              >
                {isSyncing ? (
                  <>
                    <TurbineSpinner size="sm" className="mr-2" />
                    Syncing…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Date Range Display */}
          {dailyData.length > 0 && (
            <div className="mb-4 text-center">
              <p className="text-xs text-muted-foreground">
                {timeRange === 'day' &&
                  dailyData[0]?.fullDate &&
                  format(dailyData[0].fullDate, 'EEEE, MMMM d, yyyy')}
                {timeRange === 'week' && dailyData.length > 0 && (
                  <>
                    {format(dailyData[0].fullDate, 'MMM d')} -{' '}
                    {format(dailyData[dailyData.length - 1].fullDate, 'MMM d, yyyy')}
                  </>
                )}
                {timeRange === 'month' && dailyData.length > 0 && (
                  <>
                    {format(dailyData[0].fullDate, 'MMM d')} -{' '}
                    {format(dailyData[dailyData.length - 1].fullDate, 'MMM d, yyyy')}
                  </>
                )}
                {timeRange === 'year' && dailyData.length > 0 && (
                  <>
                    {format(dailyData[0].fullDate, 'MMM yyyy')} -{' '}
                    {format(dailyData[dailyData.length - 1].fullDate, 'MMM yyyy')}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Summary Cards */}
          <div className={`grid gap-3 ${insights?.hasExport ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">Grid Import</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {insights?.totalCarbon.toFixed(1)}{' '}
                <span className="text-sm font-normal">kg CO₂</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {insights?.totalKwh.toFixed(1)} kWh
              </p>
            </Card>

            {insights?.hasExport && (
              <Card className="p-4 border-primary/20 bg-primary/5 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SunMedium className="w-5 h-5 text-primary" />
                    <span className="text-xs text-muted-foreground">Solar Export</span>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full p-0 hover:bg-primary/10"
                      >
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-3 text-xs" align="end">
                      <p>
                        Your solar export meter shows clean energy you sent back to the grid (
                        {insights.exportKwh.toFixed(1)} kWh), which actively displaces fossil fuels
                        and reduces your net footprint.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-2xl font-bold font-mono tabular-nums text-primary">
                  -{insights.exportCarbonKg.toFixed(1)}{' '}
                  <span className="text-sm font-normal font-sans">kg CO₂</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {insights.exportKwh.toFixed(1)} kWh exported
                </p>
              </Card>
            )}

            <Card
              className={`p-4 ${insights?.hasExport ? 'border-primary/20 bg-primary/5' : ''} relative`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {insights?.hasExport ? 'Net Carbon' : 'Total Carbon'}
                  </span>
                </div>
                {insights?.hasExport && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full p-0 hover:bg-primary/10"
                      >
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-3 text-xs" align="end">
                      <p>
                        Your <strong>net footprint</strong> is your grid emissions minus the carbon
                        credited for the solar you exported.
                      </p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <p
                className={`text-2xl font-bold font-mono tabular-nums ${insights?.hasExport ? 'text-primary' : 'text-foreground'}`}
              >
                {(insights?.hasExport ? insights.netCarbonKg : insights?.totalCarbon)?.toFixed(1)}{' '}
                <span className="text-sm font-normal font-sans">kg CO₂</span>
              </p>
              {insights?.hasExport && (
                <p className="text-xs text-muted-foreground mt-1">After solar offset</p>
              )}
            </Card>
          </div>

          {/* Green Score */}
          {insights && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">Green Score</h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-full p-0 hover:bg-transparent"
                          >
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[300px] p-4 bg-card border-border"
                          align="start"
                        >
                          <GreenScoreExplainerContent />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {insights.greenPercentage >= 50
                        ? 'Nice one. Most of your usage landed in clean periods.'
                        : 'Try moving a bit more of your usage into cleaner hours.'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    {insights.greenPercentage.toFixed(0)}%
                  </p>
                  <Badge
                    variant="outline"
                    className={`${
                      insights.greenPercentage >= 50
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted text-muted-foreground border-border'
                    } text-center justify-center h-auto py-1`}
                  >
                    {getGreenScoreRating(insights.greenPercentage)}
                  </Badge>
                </div>
              </div>
            </Card>
          )}

          {/* Household Comparison Card */}
          {insights && (
            <Card className="p-4 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      insights.comparison.isEfficient
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {insights.comparison.isEfficient ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : (
                      <TrendingUp className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Vs. Average</h3>
                    <p className="text-xs text-muted-foreground">{getHouseTypeLabel(houseType)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-bold font-mono tabular-nums ${insights.comparison.isEfficient ? 'text-primary' : 'text-foreground'}`}
                  >
                    {insights.comparison.isEfficient ? '-' : '+'}
                    {insights.comparison.percent.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {insights.comparison.diff > 0 ? 'More' : 'Less'} energy used
                  </p>
                </div>
              </div>

              <div className="mt-3 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                You used <strong>{insights.totalKwh.toFixed(1)} kWh</strong> vs benchmark{' '}
                <strong>{insights.comparison.benchmark.toFixed(1)} kWh</strong> based on the
                national average for your home type.
              </div>
            </Card>
          )}

          {/* Impact Visualization Card */}
          {insights && insights.carbonSaved > 0.1 && (
            <Card className="p-5 bg-primary/5 border-primary/20 mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Your Positive Impact</h3>
                      <p className="text-xs text-muted-foreground">Compared to grid average</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono tabular-nums text-primary">
                      -{insights.carbonSaved.toFixed(1)}
                      <span className="text-sm font-normal font-sans text-muted-foreground ml-1">
                        kg CO₂
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  {/* Miles Driven */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="p-3 bg-muted/30 rounded-lg flex flex-col items-center text-center gap-2 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Car className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                            {insights.impact.milesDriven}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Miles Driven
                          </p>
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-3 text-xs">
                      <p>
                        Equivalent to driving an average petrol car for{' '}
                        <strong>{insights.impact.milesDriven} miles</strong>.
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
                        Source: EPA (~0.4kg CO₂/mile)
                      </p>
                    </PopoverContent>
                  </Popover>

                  {/* Trees */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="p-3 bg-muted/30 rounded-lg flex flex-col items-center text-center gap-2 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Trees className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                            {insights.impact.treesPlanted}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Tree Days
                          </p>
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-3 text-xs">
                      <p>
                        Equivalent to the carbon absorbed by{' '}
                        <strong>{insights.impact.treesPlanted} mature trees</strong> in a single
                        day.
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
                        Source: Carbon Trust (~25kg/year/tree)
                      </p>
                    </PopoverContent>
                  </Popover>

                  {/* Smartphones */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="p-3 bg-muted/30 rounded-lg flex flex-col items-center text-center gap-2 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Smartphone className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                            {insights.impact.smartphonesCharged}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Phone Charges
                          </p>
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-3 text-xs">
                      <p>
                        Equivalent to fully charging a standard smartphone{' '}
                        <strong>{insights.impact.smartphonesCharged} times</strong>.
                      </p>
                    </PopoverContent>
                  </Popover>

                  {/* Kettles */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="p-3 bg-muted/30 rounded-lg flex flex-col items-center text-center gap-2 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Coffee className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                            {insights.impact.kettlesBoiled}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Kettles Boiled
                          </p>
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-3 text-xs">
                      <p>
                        Equivalent to boiling a full kettle of water{' '}
                        <strong>{insights.impact.kettlesBoiled} times</strong>.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-1">
                  That&apos;s the carbon you avoided by using power when the grid was cleaner.
                </p>
              </div>
            </Card>
          )}

          {/* Personalized Insights */}
          {insights && (
            <Card className="p-4">
              <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Your Insights
              </h3>
              <div className="space-y-3">
                {/* Green usage insight */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Leaf className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">
                      <strong>{insights.greenPercentage.toFixed(0)}%</strong> of your energy came
                      from low-carbon sources!
                      {insights.greenPercentage >= 70 &&
                        " You're in the top tier of eco-conscious users."}
                      {insights.greenPercentage >= 50 &&
                        insights.greenPercentage < 70 &&
                        " Keep it up! You're doing better than average."}
                      {insights.greenPercentage < 50 &&
                        ' Try running appliances during windy or sunny periods.'}
                    </p>
                  </div>
                </div>

                {/* Best day insight */}
                {insights.bestPeriod && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Star className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground">
                        <strong>{insights.bestPeriod.date}</strong> was your greenest period with
                        only <strong>{insights.bestPeriod.carbon.toFixed(1)}kg CO₂</strong>.
                        {insights.bestPeriod.carbon < 1 && " That's incredibly low."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Peak usage time insight */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  {insights.peakPeriod === 'morning' ? (
                    <Sun className="w-5 h-5 text-primary mt-0.5" />
                  ) : insights.peakPeriod === 'night' ? (
                    <Moon className="w-5 h-5 text-primary mt-0.5" />
                  ) : (
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-foreground">
                      You use most energy in the <strong>{insights.peakPeriod}</strong>.
                      {insights.peakPeriod === 'night' &&
                        ' Night-time is often cleaner. Good choice!'}
                      {insights.peakPeriod === 'afternoon' &&
                        ' Afternoon can be high-intensity. Consider shifting some usage to morning or night.'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Achievements Section */}
          <Card className="p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Achievements
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {achievementsList.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-lg border transition-all ${
                    achievement.unlocked
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/30 border-border opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}
                    >
                      {achievement.icon}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {achievement.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  {achievement.unlocked && (
                    <Badge
                      variant="outline"
                      className="mt-2 text-xs bg-primary/10 text-primary border-primary/20"
                    >
                      Unlocked!
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Daily Carbon Chart */}
          {dailyData.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium text-foreground mb-4">Carbon Footprint Trend</h3>
              <div className="h-48">
                <ComponentErrorBoundary name="Carbon Chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        yAxisId="carbon"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--primary))"
                        tickFormatter={(value) => `${value}kg`}
                      />
                      <YAxis
                        yAxisId="energy"
                        orientation="right"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--chart-3))"
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'carbon_kg') return [`${value} kg`, 'Carbon'];
                          if (name === 'kwh') return [`${value} kWh`, 'Energy'];
                          return [value, name];
                        }}
                      />
                      <Area
                        yAxisId="carbon"
                        type="monotone"
                        dataKey="carbon_kg"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#carbonGradient)"
                        name="carbon_kg"
                      />
                      <Area
                        yAxisId="energy"
                        type="monotone"
                        dataKey="kwh"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        fill="url(#energyGradient)"
                        name="kwh"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ComponentErrorBoundary>
              </div>
            </Card>
          )}

          {/* Intensity Breakdown */}
          {intensityBreakdown.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium text-foreground mb-4">Usage by Grid Intensity</h3>
              <div className="h-40">
                <ComponentErrorBoundary name="Intensity Breakdown">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={intensityBreakdown} layout="vertical">
                      <XAxis
                        type="number"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => `${value}kWh`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                          zIndex: 50,
                        }}
                        formatter={(value: number) => [`${value} kWh`, 'Energy Used']}
                      />
                      <Bar dataKey="kwh" radius={[0, 4, 4, 0]}>
                        {intensityBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={INTENSITY_COLORS[entry.index] || 'hsl(var(--muted))'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ComponentErrorBoundary>
              </div>
            </Card>
          )}

          {/* Potential Savings */}
          {insights && insights.potentialSavings > 0.1 && (
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground">Potential Savings</h3>
                  <div className="text-sm text-muted-foreground mt-1 space-y-2">
                    <p>
                      If all your usage had been in low-intensity periods, you&apos;d have saved{' '}
                      <strong className="text-foreground">
                        {insights.potentialSavings.toFixed(1)} kg CO₂
                      </strong>{' '}
                      this period.
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-md border border-primary/10">
                      <Car className="w-4 h-4 text-primary" />
                      <p className="text-xs">
                        That's equivalent to driving{' '}
                        <strong className="text-foreground">
                          {getImpactEquivalents(insights.potentialSavings).milesDriven} miles
                        </strong>{' '}
                        in an average car.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
      <EstimateDisclaimer className="text-center pt-2" />
    </div>
  );
}
