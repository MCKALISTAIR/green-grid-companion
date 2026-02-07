import { useState } from 'react';
import { Card } from '@/components/ui/card';
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
  ArrowRightLeft
} from 'lucide-react';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    cachedCredentials,
    saveCredentials,
    clearCachedCredentials
  } = useOctopusEnergy();

  const [isEditing, setIsEditing] = useState(false);

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

  const handleRelink = async () => {
    if (cachedCredentials) {
      await saveCredentials(cachedCredentials.apiKey, cachedCredentials.accountNumber);
    }
  };

  // 1. Loading State
  if (isLoading && !status) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Energy Integrations</h2>
        <Card className="p-4 h-32 flex items-center justify-center border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TurbineSpinner size="sm" />
            <span>Loading status...</span>
          </div>
        </Card>
      </div>
    )
  }

  // 1.5 Re-link Card (Has cached credentials but NOT linked)
  if (!isLinked && cachedCredentials && !isEditing) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Energy Integrations</h2>
        <Card className="p-5 border-primary/20 bg-primary/5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <OctopusLogo className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Welcome back!</h3>
                <p className="text-sm text-muted-foreground">
                  Continue with account <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{cachedCredentials.accountNumber.slice(0, 4)}***</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (confirm("Remove saved credentials from this device?")) {
                    clearCachedCredentials();
                  }
                }}
              >
                Forget
              </Button>
              <Button
                className="flex-[2]"
                onClick={handleRelink}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <TurbineSpinner size="sm" className="mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Re-link Account
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground/60 cursor-pointer hover:text-primary underline" onClick={() => setIsEditing(true)}>
              Use a different account
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // 2. No Credentials OR (Editing AND not linked) -> Show Settings Form
  if ((!hasCredentials && !isLinked) || (isEditing && !isLinked)) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Energy Integrations</h2>
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
      <h2 className="text-lg font-semibold text-foreground">Energy Integrations</h2>

      {/* Octopus Energy Card */}
      <Card className="p-4 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <OctopusLogo className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">Octopus Energy</h3>
                {isLinked && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-1.5 py-0 h-5 text-[10px]">
                    <Check className="w-3 h-3 mr-1" />
                    Linked
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
                {isLinked
                  ? 'Tracking carbon footprint from smart meter data'
                  : 'Unlock your personal Carbon Footprint & Green Score'}
              </p>
            </div>
          </div>

          {!isLinked ? (
            <div className="flex items-center gap-1">
              <Button
                variant="default"
                size="sm"
                onClick={handleLinkMeter}
                disabled={isLoading || isSyncing}
                className="bg-purple-600 hover:bg-purple-700"
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

      {/* Info Message - only show when not linked */}
      {!isLinked && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 text-xs text-muted-foreground flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground mb-1">Unlock Smart Features</p>
            <ul className="list-disc pl-4 space-y-1 mt-1">
              <li>See your <strong>Real Carbon Footprint</strong> based on actual usage.</li>
              <li>Get your <strong>Green Energy Score</strong> and personalized insights.</li>
              <li>Track your progress securely—your keys stay on your device.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
