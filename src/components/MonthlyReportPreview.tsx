import { useState } from 'react';
import { Leaf, Zap, TrendingUp, TrendingDown, Eye, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface WeeklyTrend {
  week: number;
  weekLabel: string;
  carbon_kg: number;
  kwh: number;
  avgIntensity: number;
  greenPercentage: number;
}

interface IntensityBreakdown {
  index: string;
  kwh: number;
  carbon_kg: number;
  percentage: number;
}

interface MonthlyStats {
  total_carbon_kg: number;
  total_kwh: number;
  avg_intensity: number;
  green_percentage: number;
  best_hour: string;
  footprint_records: number;
  weekly_trend: WeeklyTrend[];
  best_week: WeeklyTrend | null;
  worst_week: WeeklyTrend | null;
  by_intensity: IntensityBreakdown[];
}

const INTENSITY_COLORS: Record<string, string> = {
  'very low': 'hsl(var(--intensity-very-low))',
  low: 'hsl(var(--intensity-low))',
  moderate: 'hsl(var(--intensity-moderate))',
  high: 'hsl(var(--intensity-high))',
  'very high': 'hsl(var(--intensity-very-high))',
};

function getIntensityEmoji(avgIntensity: number): string {
  if (avgIntensity < 100) return '🌿';
  if (avgIntensity < 150) return '🍃';
  if (avgIntensity < 200) return '☁️';
  if (avgIntensity < 250) return '🏭';
  return '💨';
}

export function MonthlyReportPreview() {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [monthName, setMonthName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('monthly-report', {
        method: 'POST',
      });

      if (fnError) throw fnError;

      if (data?.monthly_stats) {
        setStats(data.monthly_stats);
        setMonthName(data.monthName || 'Last Month');
      } else {
        setError('No data available');
      }
    } catch (err) {
      logger.error('Failed to fetch monthly report preview', { error: err });
      setError('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  if (!stats && !loading && !error) {
    return (
      <Button variant="outline" size="sm" onClick={fetchPreview} className="w-full gap-2 mt-2">
        <Eye className="w-4 h-4" />
        Preview Report
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
        <TurbineSpinner size="sm" />
        <span className="text-sm">Loading preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-muted-foreground mb-2">{error}</p>
        <Button variant="ghost" size="sm" onClick={fetchPreview}>
          Retry
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const hasFootprintData = stats.footprint_records > 0;

  return (
    <Card className="p-4 mt-3 bg-gradient-to-br from-accent/10 to-primary/5 border-accent/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{getIntensityEmoji(stats.avg_intensity)}</span>
        <h4 className="font-medium text-foreground">Preview: {monthName} Report</h4>
      </div>

      {hasFootprintData ? (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
              <div className="w-7 h-7 rounded-full bg-intensity-very-low/20 flex items-center justify-center">
                <Leaf className="w-3.5 h-3.5 text-intensity-very-low" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">CO₂</p>
                <p className="text-xs font-semibold text-foreground">
                  {stats.total_carbon_kg.toFixed(1)} kg
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
              <div className="w-7 h-7 rounded-full bg-intensity-moderate/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-intensity-moderate" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Energy</p>
                <p className="text-xs font-semibold text-foreground">
                  {stats.total_kwh.toFixed(1)} kWh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Green</p>
                <p className="text-xs font-semibold text-foreground">{stats.green_percentage}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
              <div className="w-7 h-7 rounded-full bg-accent/50 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Avg</p>
                <p className="text-xs font-semibold text-foreground">{stats.avg_intensity}g</p>
              </div>
            </div>
          </div>

          {/* Weekly Trend Chart */}
          {stats.weekly_trend.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Weekly Carbon Trend</p>
              <div className="h-24 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.weekly_trend}>
                    <defs>
                      <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="weekLabel"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)} kg`, 'CO₂']}
                    />
                    <Area
                      type="monotone"
                      dataKey="carbon_kg"
                      stroke="hsl(var(--primary))"
                      fill="url(#monthlyGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Intensity Breakdown */}
          {stats.by_intensity.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Energy by Intensity</p>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.by_intensity} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="index"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Bar dataKey="kwh" radius={[0, 4, 4, 0]}>
                      {stats.by_intensity.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={INTENSITY_COLORS[entry.index] || 'hsl(var(--muted))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Best/Worst Week */}
          {stats.best_week &&
            stats.worst_week &&
            stats.best_week.week !== stats.worst_week.week && (
              <div className="flex gap-2 text-xs">
                <div className="flex-1 p-2 rounded-lg bg-intensity-very-low/10 border border-intensity-very-low/20">
                  <div className="flex items-center gap-1 text-intensity-very-low">
                    <TrendingDown className="w-3 h-3" />
                    <span className="font-medium">Best</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    {stats.best_week.weekLabel}: {stats.best_week.greenPercentage}% green
                  </p>
                </div>
                <div className="flex-1 p-2 rounded-lg bg-intensity-high/10 border border-intensity-high/20">
                  <div className="flex items-center gap-1 text-intensity-high">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-medium">Highest</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    {stats.worst_week.weekLabel}: {stats.worst_week.avgIntensity}g avg
                  </p>
                </div>
              </div>
            )}
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">📊 Your monthly report is ready!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Link your smart meter for personalised insights.
          </p>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Based on {stats.footprint_records} readings. Estimates, not advice.
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={fetchPreview}>
          Refresh
        </Button>
      </div>
    </Card>
  );
}
