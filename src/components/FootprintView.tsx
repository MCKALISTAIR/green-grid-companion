import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Leaf,
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
  Star
} from 'lucide-react';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { format, parseISO, startOfDay, getHours } from 'date-fns';

const INTENSITY_COLORS: Record<string, string> = {
  'very low': 'hsl(var(--intensity-very-low))',
  'low': 'hsl(var(--intensity-low))',
  'moderate': 'hsl(var(--intensity-moderate))',
  'high': 'hsl(var(--intensity-high))',
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
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Determine days to fetch based on range
  const daysToFetch = useMemo(() => {
    switch (timeRange) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 31;
      case 'year': return 365;
      default: return 31;
    }
  }, [timeRange]);

  const { footprint, isLoading, isLinked } = useOctopusEnergy(daysToFetch);

  // Aggregate data based on time range
  const dailyData = useMemo(() => {
    if (!footprint?.records?.length) return [];

    const aggregated: Record<string, { carbon_kg: number; kwh: number; date: Date }> = {};

    for (const record of footprint.records) {
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
      .map(d => {
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
  }, [footprint, timeRange]);

  // Calculate insights
  const insights = useMemo(() => {
    if (!footprint?.summary) return null;

    const { by_intensity_index, total_kwh, total_carbon_kg } = footprint.summary;

    // Calculate green vs dirty usage
    const greenKwh = (by_intensity_index['very low']?.kwh || 0) + (by_intensity_index['low']?.kwh || 0);
    const dirtyKwh = (by_intensity_index['high']?.kwh || 0) + (by_intensity_index['very high']?.kwh || 0);
    const greenPercentage = total_kwh > 0 ? (greenKwh / total_kwh) * 100 : 0;
    const veryLowPercentage = total_kwh > 0 ? ((by_intensity_index['very low']?.kwh || 0) / total_kwh) * 100 : 0;

    // Average intensity
    const avgIntensity = footprint.summary.avg_intensity;

    // Potential savings (if all usage was at "very low" ~50g)
    const optimalCarbon = total_kwh * 50 / 1000;
    const potentialSavings = total_carbon_kg - optimalCarbon;

    // Best period calculation
    const dataPoints = dailyData.map(d => ({ date: d.date, carbon: d.carbon_kg, kwh: d.kwh }));
    const bestPeriod = dataPoints.length > 0
      ? dataPoints.reduce((min, d) => d.carbon < min.carbon ? d : min, dataPoints[0])
      : null;

    // Time of day analysis
    const hourlyUsage: Record<string, number> = {};
    for (const record of footprint.records || []) {
      const hour = getHours(parseISO(record.interval_start));
      const period = hour >= 6 && hour < 12 ? 'morning' :
        hour >= 12 && hour < 18 ? 'afternoon' :
          hour >= 18 && hour < 22 ? 'evening' : 'night';
      hourlyUsage[period] = (hourlyUsage[period] || 0) + Number(record.consumption_kwh);
    }
    const peakPeriod = Object.entries(hourlyUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    return {
      greenPercentage,
      veryLowPercentage,
      dirtyKwh,
      avgIntensity,
      potentialSavings,
      totalCarbon: total_carbon_kg,
      totalKwh: total_kwh,
      bestPeriod,
      peakPeriod,
      recordCount: footprint.records?.length || 0,
    };
  }, [footprint, dailyData]);

  // Generate achievements
  const achievements = useMemo((): Achievement[] => {
    if (!insights) return [];

    return [
      {
        id: 'green-majority',
        title: 'Green Majority',
        description: 'Used 50%+ green energy',
        icon: <Leaf className="w-5 h-5" />,
        unlocked: insights.greenPercentage >= 50,
        color: 'green',
      },
      {
        id: 'eco-champion',
        title: 'Eco Champion',
        description: 'Used 70%+ green energy',
        icon: <Trophy className="w-5 h-5" />,
        unlocked: insights.greenPercentage >= 70,
        color: 'emerald',
      },
      {
        id: 'ultra-green',
        title: 'Ultra Green',
        description: '30%+ at very low intensity',
        icon: <Sparkles className="w-5 h-5" />,
        unlocked: insights.veryLowPercentage >= 30,
        color: 'teal',
      },
      {
        id: 'low-carbon-day',
        title: 'Low Carbon Period',
        description: 'A period under 1kg CO₂',
        icon: <Star className="w-5 h-5" />,
        unlocked: insights.bestPeriod ? insights.bestPeriod.carbon < 1 : false,
        color: 'yellow',
      },
      {
        id: 'data-tracker',
        title: 'Data Tracker',
        description: 'Tracked 100+ readings',
        icon: <Clock className="w-5 h-5" />,
        unlocked: insights.recordCount >= 100,
        color: 'blue',
      },
    ];
  }, [insights]);

  // Intensity breakdown for bar chart
  const intensityBreakdown = useMemo(() => {
    if (!footprint?.summary?.by_intensity_index) return [];

    const order = ['very low', 'low', 'moderate', 'high', 'very high'];
    return order
      .filter(idx => footprint.summary.by_intensity_index[idx])
      .map(idx => ({
        name: idx.charAt(0).toUpperCase() + idx.slice(1),
        kwh: Number(footprint.summary.by_intensity_index[idx].kwh.toFixed(1)),
        carbon: Number((footprint.summary.by_intensity_index[idx].carbon_g / 1000).toFixed(2)),
        index: idx,
      }));
  }, [footprint]);

  if (!isLinked) {
    return (
      <Card className="p-6 text-center">
        <Leaf className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-foreground mb-2">Carbon Footprint Tracking</h3>
        <p className="text-sm text-muted-foreground">
          Link your Octopus Energy meter to see your actual carbon footprint based on real consumption data.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-40 bg-muted rounded"></div>
      </Card>
    );
  }



  return (
    <div className="space-y-4">
      {/* Time Range Selector & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">My Footprint</h2>
          <p className="text-sm text-muted-foreground">Track your carbon impact over time</p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-4 sm:w-auto">
            <TabsTrigger value="day" className="text-xs px-3">Day</TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
            <TabsTrigger value="year" className="text-xs px-3">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!footprint?.records?.length ? (
        <Card className="p-6 text-center">
          <Leaf className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-foreground mb-2">No Footprint Data Yet</h3>
          <p className="text-sm text-muted-foreground">
            {timeRange === 'day' ? 'No data for this day.' : 'Sync your consumption data to see your carbon footprint.'}
          </p>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Carbon</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {insights?.totalCarbon.toFixed(1)} <span className="text-sm font-normal">kg CO₂</span>
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Energy Used</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {insights?.totalKwh.toFixed(1)} <span className="text-sm font-normal">kWh</span>
              </p>
            </Card>
          </div>

          {/* Green Score */}
          {insights && (
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Green Energy Score</h3>
                    <p className="text-sm text-muted-foreground">
                      {insights.greenPercentage >= 50
                        ? 'Great job! Most of your usage was during clean periods.'
                        : 'Try to shift more usage to low-intensity periods.'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    {insights.greenPercentage.toFixed(0)}%
                  </p>
                  <Badge
                    variant="outline"
                    className={insights.greenPercentage >= 50
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-muted text-muted-foreground border-border'
                    }
                  >
                    {insights.greenPercentage >= 70 ? 'Excellent' :
                      insights.greenPercentage >= 50 ? 'Good' :
                        insights.greenPercentage >= 30 ? 'Fair' : 'Needs Work'}
                  </Badge>
                </div>
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
                      <strong>{insights.greenPercentage.toFixed(0)}%</strong> of your energy came from low-carbon sources!
                      {insights.greenPercentage >= 70 && " You're in the top tier of eco-conscious users! 🌟"}
                      {insights.greenPercentage >= 50 && insights.greenPercentage < 70 && " Keep it up! You're doing better than average."}
                      {insights.greenPercentage < 50 && " Try running appliances during windy or sunny periods."}
                    </p>
                  </div>
                </div>

                {/* Best day insight */}
                {insights.bestPeriod && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Star className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground">
                        <strong>{insights.bestPeriod.date}</strong> was your greenest period with only{' '}
                        <strong>{insights.bestPeriod.carbon.toFixed(1)}kg CO₂</strong>!
                        {insights.bestPeriod.carbon < 1 && " That's incredibly low! 🎉"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Peak usage time insight */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  {insights.peakPeriod === 'morning' ? <Sun className="w-5 h-5 text-primary mt-0.5" /> :
                    insights.peakPeriod === 'night' ? <Moon className="w-5 h-5 text-primary mt-0.5" /> :
                      <Clock className="w-5 h-5 text-primary mt-0.5" />}
                  <div>
                    <p className="text-sm text-foreground">
                      You use most energy in the <strong>{insights.peakPeriod}</strong>.
                      {insights.peakPeriod === 'night' && " Night-time often has lower intensity – great choice!"}
                      {insights.peakPeriod === 'afternoon' && " Afternoon can be high-intensity. Consider shifting some usage to morning or night."}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Achievements Section */}
          {achievements.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Achievements
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-3 rounded-lg border transition-all ${achievement.unlocked
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/30 border-border opacity-50'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}>
                        {achievement.icon}
                      </div>
                      <span className={`text-sm font-medium ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                        {achievement.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    {achievement.unlocked && (
                      <Badge variant="outline" className="mt-2 text-xs bg-primary/10 text-primary border-primary/20">
                        Unlocked!
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Daily Carbon Chart */}
          {dailyData.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium text-foreground mb-4">Carbon Footprint Trend</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
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
                      stroke="#fbbf24"
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
                      stroke="#fbbf24"
                      strokeWidth={2}
                      fill="url(#energyGradient)"
                      name="kwh"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Intensity Breakdown */}
          {intensityBreakdown.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium text-foreground mb-4">Usage by Grid Intensity</h3>
              <div className="h-40">
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
                      formatter={(value: number, name: string) => [
                        `${value} kWh`,
                        'Energy Used'
                      ]}
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
                  <p className="text-sm text-muted-foreground mt-1">
                    If all your usage was during low-intensity periods, you could save up to{' '}
                    <strong className="text-foreground">{insights.potentialSavings.toFixed(1)} kg CO₂</strong> per week!
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
