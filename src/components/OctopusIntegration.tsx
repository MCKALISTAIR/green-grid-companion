import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { SettingsSectionHeading } from '@/components/settings/SettingsSectionHeading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Wind,
  Check,
  Zap,
  Leaf,
  MoreVertical,
  LogOut,
  ArrowRightLeft,
  Info,
  History,
} from 'lucide-react';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { formatDistanceToNow } from 'date-fns';
import { OctopusBenefitsIntro } from './OctopusBenefitsIntro';
import { OctopusLinkSheet } from './OctopusLinkSheet';
import { OctopusStaleNotice } from './OctopusStaleNotice';
import { linkFailureMessage } from '@/lib/octopusLink';
import {
  OCTOPUS_LINKED_CARD_COPY as LINKED,
  OCTOPUS_MPAN_COPY as MPAN,
  OCTOPUS_NOT_LINKED_COPY as NOT_LINKED,
} from '@/lib/voice/octopusLinkCopy';

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
    recheckMeters,
    fullSync,
    disconnect,
    apiKeyHint,
  } = useOctopusEnergy();

  // BH-93 (PR-O2; the brief calls it BH-92): Switch Account still only sets
  // this, which does nothing while linked, exactly as on main. PR-O2 replaces
  // it with a confirm, then the sheet.
  const [isEditing, setIsEditing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const openSheet = () => setSheetOpen(true);
  const sheet = (
    <OctopusLinkSheet
      open={sheetOpen || (isEditing && !isLinked)}
      onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) setIsEditing(false);
      }}
    />
  );

  // "Check again" on the Not linked yet card: get-meters only. The card has no
  // banner, so the reason goes in a toast (same copy as the sheet).
  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      const result = await recheckMeters();
      if (result.ok) toast.success(`Linked ${result.meters.length} meter(s).`);
      else toast.error(linkFailureMessage(result));
    } finally {
      setChecking(false);
    }
  };

  const handleSync = async () => {
    try {
      await fullSync(30); // Sync last 30 days
    } catch {
      // Error handled in hook
    }
  };

  const handleDisconnect = async () => {
    if (confirm("Disconnect Octopus? We'll remove your Octopus details and unlink your meters.")) {
      await disconnect();
    }
  };

  // The sheet sits at the same place in the tree in every state. Saving the
  // details flips the card from the entry state to the dashboard state while
  // the sheet is still open, and a moved sheet would remount and lose its
  // success screen.
  let body: JSX.Element;
  if (isLoading && !status) {
    // 1. Loading State
    body = (
      <Card className="p-4 h-32 flex items-center justify-center border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TurbineSpinner size="sm" />
          <span>Loading status...</span>
        </div>
      </Card>
    );
  } else if (!hasCredentials && !isLinked) {
    // 2. Nothing saved yet -> entry card; the button opens the linking sheet.
    body = <OctopusBenefitsIntro onContinue={openSheet} />;
  } else {
    // 3. Has Credentials -> Show Integration Dashboard
    body = dashboardCard();
  }

  return (
    <div className="space-y-4">
      <SettingsSectionHeading>Energy Integrations</SettingsSectionHeading>
      {body}
      {sheet}
    </div>
  );

  function dashboardCard() {
    return (
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
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-600 border-green-500/20 px-1.5 py-0 h-5 text-[10px]"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {LINKED.badge}
                  </Badge>
                ) : hasCredentials ? (
                  <Badge
                    variant="outline"
                    className="whitespace-nowrap bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-1.5 py-0 h-5 text-[10px]"
                  >
                    {NOT_LINKED.badge}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground max-w-[220px] mt-1">
                {isLinked ? LINKED.line : NOT_LINKED.line}
              </p>
              {hasCredentials && apiKeyHint && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {NOT_LINKED.keyEnding} <span className="font-mono">••••{apiKeyHint}</span>
                </p>
              )}
            </div>
          </div>

          {!isLinked ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 -mr-2 -mt-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openSheet}>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  {NOT_LINKED.change}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {NOT_LINKED.remove}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? (
                    <TurbineSpinner size="sm" className="mr-2" />
                  ) : (
                    <Wind className="w-4 h-4 mr-2" />
                  )}
                  Sync Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Switch Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Not linked yet (3.4): details saved, no meter from Octopus */}
        {!isLinked && (
          <div className="mt-4 flex flex-col gap-2" data-testid="octopus-not-linked-actions">
            <Button className="h-11 w-full font-semibold" onClick={openSheet}>
              {NOT_LINKED.fix}
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={handleCheckAgain}
              disabled={checking || isSyncing}
            >
              {checking ? (
                <>
                  <TurbineSpinner size="sm" className="mr-2" />
                  {NOT_LINKED.checking}
                </>
              ) : (
                NOT_LINKED.checkAgain
              )}
            </Button>
          </div>
        )}

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
                        <button
                          className="inline-flex items-center justify-center rounded-full hover:bg-muted p-0.5"
                          aria-label={MPAN.trigger}
                        >
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-3 text-xs" align="start">
                        <p className="font-medium mb-1">{MPAN.title}</p>
                        <p className="text-muted-foreground">{MPAN.body}</p>
                      </PopoverContent>
                    </Popover>
                    {meter.meter_type === 'export' && (
                      <Badge
                        variant="outline"
                        className="ml-1.5 text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/20"
                      >
                        Export
                      </Badge>
                    )}
                  </span>
                </div>
                {meter.last_sync_at && (
                  <span className="text-xs text-muted-foreground">
                    {LINKED.lastSynced(
                      formatDistanceToNow(new Date(meter.last_sync_at), { addSuffix: true }),
                    )}
                  </span>
                )}
              </div>
            ))}
            <OctopusStaleNotice latestConsumption={status.latest_consumption} />
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
    );
  }
}
