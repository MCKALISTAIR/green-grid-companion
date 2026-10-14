import { useState } from 'react';
import { Leaf, Zap, Clock, TrendingUp, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';

interface WeeklyStats {
  total_carbon_kg: number;
  total_kwh: number;
  avg_intensity: number;
  green_percentage: number;
  best_hour: string;
  best_time_today: string;
  footprint_records: number;
}

function getIntensityEmoji(avgIntensity: number): string {
  if (avgIntensity < 100) return '🌿';
  if (avgIntensity < 150) return '🍃';
  if (avgIntensity < 200) return '☁️';
  if (avgIntensity < 250) return '🏭';
  return '💨';
}

function getIntensityLabel(avgIntensity: number): string {
  if (avgIntensity < 100) return 'Very Low';
  if (avgIntensity < 150) return 'Low';
  if (avgIntensity < 200) return 'Moderate';
  if (avgIntensity < 250) return 'High';
  return 'Very High';
}

export function WeeklyDigestPreview() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('weekly-digest', {
        method: 'POST',
      });

      if (fnError) throw fnError;

      if (data?.weekly_stats) {
        setStats(data.weekly_stats);
      } else {
        setError('No data available');
      }
    } catch (err) {
      logger.error('Failed to fetch weekly digest preview', { error: err });
      setError('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  if (!stats && !loading && !error) {
    return (
      <Button variant="outline" size="sm" onClick={fetchPreview} className="w-full gap-2 mt-2">
        <Eye className="w-4 h-4" />
        Preview Digest
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
    <Card className="p-4 mt-3 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{getIntensityEmoji(stats.avg_intensity)}</span>
        <h4 className="font-medium text-foreground">Preview: Your Weekly Digest</h4>
      </div>

      {hasFootprintData ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Carbon Emissions */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <div className="w-8 h-8 rounded-full bg-intensity-very-low/20 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-intensity-very-low" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CO₂ Emissions</p>
              <p className="text-sm font-semibold text-foreground">
                {stats.total_carbon_kg.toFixed(1)} kg
              </p>
            </div>
          </div>

          {/* Energy Usage */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <div className="w-8 h-8 rounded-full bg-intensity-moderate/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-intensity-moderate" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Energy Used</p>
              <p className="text-sm font-semibold text-foreground">
                {stats.total_kwh.toFixed(1)} kWh
              </p>
            </div>
          </div>

          {/* Green Energy % */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Green Energy</p>
              <p className="text-sm font-semibold text-foreground">{stats.green_percentage}%</p>
            </div>
          </div>

          {/* Best Time */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <div className="w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best Time</p>
              <p className="text-sm font-semibold text-foreground">{stats.best_hour}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            💡 Best time to use energy today:{' '}
            <span className="font-medium">{stats.best_time_today}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Link your smart meter for personalised insights!
          </p>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Based on {stats.footprint_records} readings
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={fetchPreview}>
          Refresh
        </Button>
      </div>
    </Card>
  );
}
