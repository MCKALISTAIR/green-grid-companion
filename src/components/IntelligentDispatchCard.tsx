import { format, formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOctopusEnergy, DispatchSlot } from '@/hooks/useOctopusEnergy';
import { Zap, Clock, CheckCircle2, BatteryCharging, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IntelligentDispatchCard() {
  const { 
    isLinked, 
    intelligentDispatches, 
    isLoadingDispatches,
    refreshDispatches,
    isSyncing 
  } = useOctopusEnergy();

  // Only show if linked and has Intelligent tariff data
  if (!isLinked || !intelligentDispatches) {
    return null;
  }

  const { planned, completed, chargingStarted, chargingStartDispatch } = intelligentDispatches;

  // If no Intelligent tariff detected
  if (!planned && !completed) {
    return null;
  }

  const now = new Date();

  // Find current/active dispatch
  const activeDispatch = [...(planned || []), ...(completed || [])].find((d: DispatchSlot) => {
    const start = new Date(d.start || d.startDt!);
    const end = new Date(d.end || d.endDt!);
    return start <= now && end >= now;
  });

  // Upcoming planned dispatches (future only)
  const upcomingPlanned = (planned || [])
    .filter((d: DispatchSlot) => new Date(d.start || d.startDt!) > now)
    .sort((a: DispatchSlot, b: DispatchSlot) => 
      new Date(a.start || a.startDt!).getTime() - new Date(b.start || b.startDt!).getTime()
    )
    .slice(0, 3);

  // Recent completed dispatches (last 24 hours)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentCompleted = (completed || [])
    .filter((d: DispatchSlot) => new Date(d.end || d.endDt!) > yesterday && new Date(d.end || d.endDt!) < now)
    .sort((a: DispatchSlot, b: DispatchSlot) => 
      new Date(b.start || b.startDt!).getTime() - new Date(a.start || a.startDt!).getTime()
    )
    .slice(0, 3);

  // If nothing to show, hide the card
  if (!activeDispatch && upcomingPlanned.length === 0 && recentCompleted.length === 0) {
    return null;
  }

  const formatTime = (dateStr: string) => format(new Date(dateStr), 'HH:mm');
  const formatDate = (dateStr: string) => format(new Date(dateStr), 'EEE d MMM');

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Intelligent Charging</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshDispatches?.()}
          disabled={isSyncing || isLoadingDispatches}
          className="h-8 px-2"
        >
          {(isSyncing || isLoadingDispatches) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="text-xs">Refresh</span>
          )}
        </Button>
      </div>

      {/* Active Charging Banner */}
      {activeDispatch && (
        <div className="mb-3 p-3 rounded-lg bg-primary/20 border border-primary/30 animate-pulse">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-primary" />
            <span className="font-medium text-primary">
              Charging Now!
            </span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Until {formatTime(activeDispatch.end || activeDispatch.endDt!)}
            {activeDispatch.chargeKwh && ` • ~${activeDispatch.chargeKwh.toFixed(1)} kWh`}
          </div>
        </div>
      )}

      {/* Charging Started Alert */}
      {chargingStarted && chargingStartDispatch && !activeDispatch && (
        <div className="mb-3 p-3 rounded-lg bg-accent border border-accent/50">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-accent-foreground" />
            <span className="font-medium text-accent-foreground">
              Charging just started!
            </span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Started at {formatTime(chargingStartDispatch.startTime)}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Upcoming Planned */}
        {upcomingPlanned.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Clock className="w-3 h-3" />
              <span>Scheduled</span>
            </div>
            <div className="space-y-2">
              {upcomingPlanned.map((dispatch: DispatchSlot, idx: number) => {
                const startTime = new Date(dispatch.start || dispatch.startDt!);
                const isToday = startTime.toDateString() === now.toDateString();
                const isTomorrow = startTime.toDateString() === new Date(now.getTime() + 86400000).toDateString();

                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2 rounded-lg bg-background/60"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(dispatch.start || dispatch.startDt!)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(dispatch.start || dispatch.startDt!)} - {formatTime(dispatch.end || dispatch.endDt!)}
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {formatDistanceToNow(startTime, { addSuffix: true })}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Completed */}
        {recentCompleted.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <CheckCircle2 className="w-3 h-3" />
              <span>Recent Sessions</span>
            </div>
            <div className="space-y-2">
              {recentCompleted.map((dispatch: DispatchSlot, idx: number) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 rounded-lg bg-background/40 opacity-80"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(dispatch.start || dispatch.startDt!)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(dispatch.start || dispatch.startDt!)} - {formatTime(dispatch.end || dispatch.endDt!)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dispatch.chargeKwh && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {dispatch.chargeKwh.toFixed(1)} kWh
                      </span>
                    )}
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-muted-foreground flex gap-1 items-center">
        <Zap className="w-3 h-3" />
        <span>Smart charging optimises for cheap, green energy.</span>
      </div>
    </Card>
  );
}
