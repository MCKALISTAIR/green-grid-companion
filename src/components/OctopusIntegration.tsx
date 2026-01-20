import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlugZap, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Zap,
  TrendingDown,
  TrendingUp,
  Leaf
} from 'lucide-react';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { format, formatDistanceToNow } from 'date-fns';

const OctopusLogo = ({ className }: { className?: string }) => (
  <img
    src="/octopus_logo.png"
    alt="Octopus Energy Logo"
    className={`${className} object-contain`}
  />
);

export function OctopusIntegration() {
  const { 
    status, 
    isLoading, 
    isSyncing, 
    isLinked,
    linkMeter,
    fullSync 
  } = useOctopusEnergy();

  const handleLinkMeter = async () => {
    try {
      await linkMeter();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSync = async () => {
    try {
      await fullSync(30); // Sync last 30 days
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Energy Integrations</h2>

      {/* Octopus Energy Card */}
      <Card className="p-4 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <OctopusLogo className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">Octopus Energy</h3>
                {isLinked && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Check className="w-3 h-3 mr-1" />
                    Linked
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                {isLinked 
                  ? 'Track your actual carbon footprint from meter data'
                  : 'Link your meter to track real energy consumption'}
              </p>
            </div>
          </div>
          
          {!isLinked ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleLinkMeter}
              disabled={isLoading || isSyncing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <PlugZap className="w-4 h-4 mr-2" />
                  Link Meter
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Data
                </>
              )}
            </Button>
          )}
        </div>

        {/* Meter Status */}
        {isLinked && status && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
            {status.meters?.map((meter) => (
              <div key={meter.mpan} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-muted-foreground">MPAN: {meter.mpan.slice(-6)}</span>
                </div>
                {meter.last_sync_at && (
                  <span className="text-xs text-muted-foreground">
                    Last sync: {formatDistanceToNow(new Date(meter.last_sync_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            ))}
            {status.footprint_records > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Leaf className="w-4 h-4 text-green-500" />
                <span>{status.footprint_records} footprint records calculated</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Info Message */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 text-xs text-muted-foreground flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-foreground mb-1">How it works</p>
          <p>
            Your API key is stored securely and used to fetch your smart meter readings. 
            We combine this with grid carbon intensity data to calculate your actual carbon footprint.
          </p>
        </div>
      </div>
    </div>
  );
}
