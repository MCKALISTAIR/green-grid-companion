import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { SettingsSectionHeading } from '@/components/settings/SettingsSectionHeading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wind,
  Check,
  AlertCircle,
  Zap,
  Leaf,
  MoreVertical,
  LogOut,
  ArrowRightLeft,
  Info,
  History
} from 'lucide-react';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { formatDistanceToNow } from 'date-fns';
import { OctopusSettings } from './OctopusSettings';

const OctopusLogo = ({ className }: { className?: string }) => (
  <img
    src="/octopus_logo.png" // Ensure this path is correct
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
    hasCredentials,
    linkMeter,
    fullSync,
    disconnect,
    apiKeyHint,
  } = useOctopusEnergy();

  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

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

  const handleDisconnect = async () => {
    if (confirm("Are you sure you want to disconnect? This will remove your credentials and unlink your meters.")) {
      await disconnect();
    }
  };

  // 1. Loading State
  if (isLoading && !status) {
    return (
      <div className="space-y-4">
        <SettingsSectionHeading>Energy Integrations</SettingsSectionHeading>
        <Card className="p-4 h-32 flex items-center justify-center border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TurbineSpinner size="sm" />
            <span>Loading status...</span>
          </div>
        </Card>
      </div>
    )
  }

  // 2. No Credentials OR (Editing AND not linked) -> Show Settings Form
  if ((!hasCredentials && !isLinked) || (isEditing && !isLinked)) {
    return (
      <div className="space-y-4">
        <SettingsSectionHeading>Energy Integrations</SettingsSectionHeading>
        <OctopusSettings
          onSaved={() => setIsEditing(false)}
          onCancel={isEditing ? () => setIsEditing(false) : undefined}
        />
      </div>
    )
  }

  // 3. Has Credentials -> Show Integration Dashboard
  return (
    <div className="space-y-4">
      <SettingsSectionHeading>Energy Integrations</SettingsSectionHeading>

      {/* Octopus Energy Card */}
      <Card className="p-4 border-primary/15 bg-primary/5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <OctopusLogo className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">Octopus Energy</h3>
                {isLinked ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-1.5 py-0 h-5 text-[10px]">
                    <Check className="w-3 h-3 mr-1" />
                    Meters linked
                  </Badge>
                ) : hasCredentials ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-1.5 py-0 h-5 text-[10px]">
                    Credentials saved
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground max-w-[220px] mt-1">
                {isLinked
                  ? 'Tracking carbon footprint from smart meter data'
                  : hasCredentials
                    ? 'Next step: link your electricity meter(s) to sync usage'
                    : 'Unlock your personal Carbon Footprint & Green Score'}
              </p>
              {hasCredentials && apiKeyHint && (
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  API key ending <span className="font-mono">••••{apiKeyHint}</span>
                </p>
              )}
            </div>
          </div>

          {!isLinked ? (
            <div className="flex items-center gap-1">
              <Button
                variant="default"
                size="sm"
                onClick={handleLinkMeter}
                disabled={isLoading || isSyncing}
                className="bg-primary hover:bg-primary/90"
              >
                {isSyncing ? (
                  <>
                    <TurbineSpinner size="sm" className="mr-2" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Wind className="w-4 h-4 mr-2" />
                    Link Meter
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Change Credentials
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDisconnect} className="text-red-600 focus:text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Clear Credentials
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? <TurbineSpinner size="sm" className="mr-2" /> : <Wind className="w-4 h-4 mr-2" />}
                  Sync Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Switch Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDisconnect} className="text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Meter Status */}
        {isLinked && status && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
            {status.meters?.map((meter) => (
              <div key={meter.mpan} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    MPAN: {meter.mpan.slice(-6)}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="inline-flex items-center justify-center rounded-full hover:bg-muted p-0.5" aria-label="What is an MPAN?">
                          <Info className="w-3 h-3 text-muted-foreground/60" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-3 text-xs" align="start">
                        <p className="font-medium mb-1">What's an MPAN?</p>
                        <p className="text-muted-foreground">
                          MPAN (Meter Point Administration Number) is a unique 13-digit number that identifies your electricity meter.
                          You can find it on your energy bill.
                        </p>
                      </PopoverContent>
                    </Popover>
                    {meter.meter_type === 'export' && (
                      <Badge variant="outline" className="ml-1.5 text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/20">
                        Export
                      </Badge>
                    )}
                  </span>
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
            <div className="flex gap-2 w-full mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <TurbineSpinner size="sm" className="mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Wind className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/charging-history')}
                className="flex-1 gap-1.5"
              >
                <History className="w-4 h-4 text-primary" />
                Charging History
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Info Message - only show when not linked */}
      {!isLinked && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 text-xs text-muted-foreground flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground mb-1">Unlock Smart Features</p>
            <ul className="list-disc pl-4 space-y-1 mt-1">
              <li>See your <strong>Real Carbon Footprint</strong> based on actual usage.</li>
              <li>Get your <strong>Green Energy Score</strong> and personalized insights.</li>
              <li>Your API key is sent once over HTTPS and stored encrypted on our servers. It's never kept on your device.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
