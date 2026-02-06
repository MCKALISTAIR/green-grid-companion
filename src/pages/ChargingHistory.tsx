import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { 
  BatteryCharging, Clock, Zap, ArrowLeft, CheckCircle2, 
  Calendar, TrendingUp 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ensureAuthSession } from '@/lib/auth-utils';

interface ChargingSession {
  id: string;
  dispatch_type: string;
  start_time: string;
  end_time: string;
  charge_kwh: number | null;
  source: string | null;
  location: string | null;
  created_at: string;
  avg_intensity_gco2: number | null;
  carbon_used_g: number | null;
  carbon_saved_g: number | null;
}

function ChargingHistory() {
  const navigate = useNavigate();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['charging-history'],
    queryFn: async (): Promise<ChargingSession[]> => {
      const session = await ensureAuthSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('octopus_intelligent_dispatches')
        .select('id, dispatch_type, start_time, end_time, charge_kwh, source, location, created_at, avg_intensity_gco2, carbon_used_g, carbon_saved_g')
        .eq('dispatch_type', 'completed')
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as ChargingSession[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const totalEnergy = sessions?.reduce((sum, s) => sum + (s.charge_kwh || 0), 0) ?? 0;
  const totalSessions = sessions?.length ?? 0;

  // Group sessions by date
  const groupedSessions = (sessions || []).reduce<Record<string, ChargingSession[]>>((groups, session) => {
    const dateKey = format(new Date(session.start_time), 'yyyy-MM-dd');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(session);
    return groups;
  }, {});

  const formatTime = (dateStr: string) => format(new Date(dateStr), 'HH:mm');
  const formatDateLabel = (dateKey: string) => {
    const date = new Date(dateKey);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today.getTime() - 86400000);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return format(date, 'EEEE d MMMM');
  };

  return (
    <div className="max-w-lg mx-auto pb-24 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Charging History</h1>
          <p className="text-sm text-muted-foreground">Past Intelligent dispatch sessions</p>
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && totalSessions > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <BatteryCharging className="w-4 h-4" />
              <span className="text-xs">Sessions</span>
            </div>
            <span className="text-2xl font-bold">{totalSessions}</span>
          </Card>
          <Card className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total Energy</span>
            </div>
            <span className="text-2xl font-bold">{totalEnergy.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground ml-1">kWh</span>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && totalSessions === 0 && (
        <EmptyState
          icon={BatteryCharging}
          title="No charging sessions yet"
          description="Once Octopus schedules and completes smart charging sessions, they'll appear here."
        />
      )}

      {/* Grouped Session List */}
      {!isLoading && Object.entries(groupedSessions).map(([dateKey, daySessions]) => (
        <div key={dateKey} className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {formatDateLabel(dateKey)}
            </span>
          </div>
          <div className="space-y-2">
            {daySessions.map((session) => {
              const duration = differenceInMinutes(
                new Date(session.end_time), 
                new Date(session.start_time)
              );
              const hours = Math.floor(duration / 60);
              const mins = duration % 60;
              const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

              return (
                <Card key={session.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-full bg-primary/10">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {formatTime(session.start_time)} – {formatTime(session.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {durationStr}
                          </span>
                          {session.source && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {session.source}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {session.charge_kwh != null && session.charge_kwh > 0 ? (
                        <span className="font-semibold text-sm">
                          {session.charge_kwh.toFixed(1)} kWh
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {!isLoading && totalSessions > 0 && (
        <div className="text-center text-xs text-muted-foreground mt-4">
          Showing last {totalSessions} sessions
        </div>
      )}
    </div>
  );
}

export default ChargingHistory;
