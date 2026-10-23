import { SettingsSectionHeading } from '@/components/settings/SettingsSectionHeading';
import { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  Clock,
  Zap,
  Smartphone,
  CalendarDays,
  FileText,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications, DIGEST_DELIVERY_AVAILABLE } from '@/hooks/useNotifications';
import { MonthlyReportPreview } from './MonthlyReportPreview';
import { logger } from '@/lib/logger';
import { TEST_NOTIFICATION } from '@/lib/voice/notificationCopy';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettings({ onClose: _onClose }: NotificationSettingsProps) {
  const {
    isNative,
    isSupported,
    permissionStatus,
    prefs,
    requestPermission,
    updatePreference,
    highIntensityBounds,
  } = useNotifications();

  // Reusable toggle handler with permission check - type-safe for boolean preferences
  const createToggleHandler =
    <K extends keyof typeof prefs>(
      prefKey: K extends string ? ((typeof prefs)[K] extends boolean ? K : never) : never,
    ) =>
    async (enabled: boolean) => {
      if (enabled) {
        // Always re-verify permission to catch edge cases where user revoked it in OS settings
        const granted = await requestPermission();
        if (!granted) return;
      }
      updatePreference(prefKey, enabled);
    };

  const handleLowIntensityToggle = createToggleHandler('lowIntensityEnabled');
  const handleHighIntensityToggle = createToggleHandler('highIntensityEnabled');
  const handleDailyForecastToggle = createToggleHandler('dailyForecastEnabled');

  // Local state for sliders to ensure smooth dragging without constant storage writes
  const [localThreshold, setLocalThreshold] = useState(prefs.lowIntensityThreshold);
  const [localHighThreshold, setLocalHighThreshold] = useState(prefs.highIntensityThreshold);

  useEffect(() => {
    setLocalThreshold(prefs.lowIntensityThreshold);
  }, [prefs.lowIntensityThreshold]);

  useEffect(() => {
    setLocalHighThreshold(prefs.highIntensityThreshold);
  }, [prefs.highIntensityThreshold]);

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <SettingsSectionHeading>Notifications</SettingsSectionHeading>
        {isNative && permissionStatus === 'granted' && (
          <Badge variant="secondary" className="gap-1">
            <Smartphone className="w-3 h-3" />
            Native
          </Badge>
        )}
      </div>

      {/* Not Supported Message */}
      {!isSupported && (
        <Card className="p-4 bg-accent/30 border-accent/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Not supported</p>
              <p className="text-xs text-muted-foreground">
                Your browser does not support notifications.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Permissions blocked — offer to re-request or open settings */}
      {isSupported && permissionStatus === 'denied' && (
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Notifications blocked</p>
                <p className="text-xs text-muted-foreground">
                  {isNative
                    ? 'Open your device Settings > GridSense > Notifications to enable.'
                    : 'Please enable notifications in your browser settings, then refresh.'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={async () => {
                // On native, we can't programmatically open settings without additional plugins
                // Just re-request permission as a fallback
                await requestPermission();
              }}
            >
              {isNative ? 'Try Again' : 'Enable'}
            </Button>
          </div>
        </Card>
      )}

      {isSupported && permissionStatus === 'prompt' && (
        <Card className="p-4 bg-primary/10 border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Enable notifications</p>
                <p className="text-xs text-muted-foreground">
                  Get alerts when carbon intensity is low.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={requestPermission}>
              Enable
            </Button>
          </div>
        </Card>
      )}

      {/* Test Notification Button */}
      {isSupported && permissionStatus === 'granted' && (
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Test Notification</p>
                <p className="text-xs text-muted-foreground">Verify notifications are working</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                try {
                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        title: TEST_NOTIFICATION.title,
                        body: TEST_NOTIFICATION.body,
                        id: Date.now(),
                        schedule: { at: new Date(Date.now() + 1000) },
                      },
                    ],
                  });
                } catch (error) {
                  logger.debug('Test notification failed', { error });
                }
              }}
            >
              Send Test
            </Button>
          </div>
        </Card>
      )}

      {/* Low Intensity Alert */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-intensity-very-low/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-intensity-very-low-text" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Best Time to Use Energy</h3>
              <p className="text-sm text-muted-foreground">
                Get notified when it's perfect for running appliances or charging devices
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.lowIntensityEnabled}
            onCheckedChange={handleLowIntensityToggle}
            disabled={!isSupported}
            aria-label="Toggle low carbon intensity alerts"
          />
        </div>

        {prefs.lowIntensityEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Alert when below:</span>
              <span className="font-medium text-primary">{localThreshold} gCO₂/kWh</span>
            </div>
            <Slider
              value={[localThreshold]}
              onValueChange={([value]) => setLocalThreshold(value)}
              onValueCommit={([value]) => updatePreference('lowIntensityThreshold', value)}
              min={0}
              max={200}
              step={1}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              You'll be notified <span className="font-medium text-foreground">once</span> when
              intensity drops below {localThreshold} gCO₂/kWh, and{' '}
              <span className="font-medium text-foreground">once</span> when it rises back above.
              Not on every change.
            </p>
            <div className="pt-4 mt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-sm font-medium">Live Accuracy Mode</div>
                  <p className="text-[10px] text-muted-foreground">
                    Uses live checks instead of pre-scheduling green windows.
                    {isNative
                      ? ' (Background Fetch, which may use slightly more battery.)'
                      : ' (Tab must remain open.)'}{' '}
                    Planner reminders still work.
                  </p>
                </div>
                <Switch
                  checked={prefs.useBackgroundFetch}
                  onCheckedChange={(checked) => updatePreference('useBackgroundFetch', checked)}
                  aria-label="Toggle live accuracy mode background fetch"
                />
              </div>
            </div>
            {prefs.useBackgroundFetch && (
              <p className="text-[10px] text-amber-500/80 pt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />{' '}
                {isNative
                  ? 'May use slightly more battery.'
                  : 'Only works while this tab is active.'}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* High Intensity Alert */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Avoid High Carbon Times</h3>
              <p className="text-sm text-muted-foreground">
                Get warned when the grid gets dirty so you can delay heavy usage
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.highIntensityEnabled}
            onCheckedChange={handleHighIntensityToggle}
            disabled={!isSupported}
            aria-label="Toggle high carbon intensity alerts"
          />
        </div>

        {prefs.highIntensityEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Alert when above:</span>
              <span className="font-medium text-destructive">{localHighThreshold} gCO₂/kWh</span>
            </div>
            <Slider
              value={[localHighThreshold]}
              onValueChange={([value]) => setLocalHighThreshold(value)}
              onValueCommit={([value]) => updatePreference('highIntensityThreshold', value)}
              min={highIntensityBounds?.min ?? 50}
              max={highIntensityBounds?.max ?? 400}
              step={5}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              You'll be notified <span className="font-medium text-foreground">once</span> when
              intensity rises above {localHighThreshold} gCO₂/kWh, and{' '}
              <span className="font-medium text-foreground">once</span> when it drops back below.
              Not on every change.
            </p>
          </div>
        )}
      </Card>

      {/* Daily Forecast */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Daily Energy Outlook</h3>
              <p className="text-sm text-muted-foreground">
                Morning summary with best times to use energy today
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.dailyForecastEnabled}
            onCheckedChange={handleDailyForecastToggle}
            disabled={!isSupported}
            aria-label="Toggle daily energy outlook forecast"
          />
        </div>

        {prefs.dailyForecastEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Send at:</span>
              <input
                type="time"
                value={prefs.dailyForecastTime}
                onChange={(e) => updatePreference('dailyForecastTime', e.target.value)}
                className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Weekly Digest — server push not wired from Settings yet */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">Weekly Digest</h3>
                <Badge variant="secondary" className="text-[10px]">
                  Coming soon
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Summary of your carbon footprint &amp; best times
              </p>
            </div>
          </div>
          <Switch checked={false} disabled aria-label="Weekly digest coming soon" />
        </div>
        {!DIGEST_DELIVERY_AVAILABLE && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            Digests need reliable server push registration. We&apos;ve disabled this toggle so it
            can&apos;t look enabled without delivering.
          </p>
        )}
      </Card>

      {/* Monthly Report — server push not wired from Settings yet */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">Monthly Report</h3>
                <Badge variant="secondary" className="text-[10px]">
                  Coming soon
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Detailed carbon analysis with trends</p>
            </div>
          </div>
          <Switch checked={false} disabled aria-label="Monthly report coming soon" />
        </div>
        {!DIGEST_DELIVERY_AVAILABLE && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            Same as weekly digests: the preview below is only an example until push delivery ships.
          </p>
        )}
        <div className="pt-1">
          <MonthlyReportPreview />
        </div>
      </Card>

      {!isSupported && (
        <p className="text-xs text-center text-muted-foreground">
          Notifications are not supported in this browser.
        </p>
      )}

      {/* Display Preferences */}
      <div className="pt-4 border-t border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Display Preferences</h2>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Weather in Energy Insights</h3>
                <p className="text-sm text-muted-foreground">Show local weather conditions</p>
              </div>
            </div>
            <Switch
              checked={prefs.showWeatherInInsights}
              onCheckedChange={(checked) => updatePreference('showWeatherInInsights', checked)}
              aria-label="Toggle weather display in energy insights"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
