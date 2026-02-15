import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Zap, Smartphone, CalendarDays, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';
import { WeeklyDigestPreview } from './WeeklyDigestPreview';
import { MonthlyReportPreview } from './MonthlyReportPreview';
import { logger } from '@/lib/logger';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const {
    isNative,
    isSupported,
    permissionStatus,
    prefs,
    requestPermission,
    updatePreference,
  } = useNotifications();

  // Reusable toggle handler with permission check - type-safe for boolean preferences
  const createToggleHandler = <K extends keyof typeof prefs>(
    prefKey: K extends string ? (typeof prefs[K] extends boolean ? K : never) : never
  ) => async (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    updatePreference(prefKey, enabled);
  };

  const handleLowIntensityToggle = createToggleHandler('lowIntensityEnabled');
  const handleHighIntensityToggle = createToggleHandler('highIntensityEnabled');
  const handleDailyForecastToggle = createToggleHandler('dailyForecastEnabled');
  const handleWeeklyDigestToggle = createToggleHandler('weeklyDigestEnabled');
  const handleMonthlyReportToggle = createToggleHandler('monthlyReportEnabled');

  // Local state for sliders to ensure smooth dragging without constant storage writes
  const [localThreshold, setLocalThreshold] = useState(prefs.lowIntensityThreshold);
  const [localHighThreshold, setLocalHighThreshold] = useState(prefs.highIntensityThreshold);

  useEffect(() => {
    setLocalThreshold(prefs.lowIntensityThreshold);
  }, [prefs.lowIntensityThreshold]);

  useEffect(() => {
    setLocalHighThreshold(prefs.highIntensityThreshold);
  }, [prefs.highIntensityThreshold]);

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const monthDayOptions = Array.from({ length: 28 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
  }));

  function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
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
            <Smartphone className="w-5 h-5 text-accent-foreground" />
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
                <p className="text-xs text-muted-foreground">
                  Verify notifications are working
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                try {
                  await LocalNotifications.schedule({
                    notifications: [{
                      title: 'GridSense Test',
                      body: '✅ Notifications are working perfectly!',
                      id: Date.now(),
                      schedule: { at: new Date(Date.now() + 1000) },
                    }]
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
              <Zap className="w-5 h-5 text-intensity-very-low" />
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
          />
        </div>

        {prefs.lowIntensityEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Alert when below:
              </span>
              <span className="font-medium text-primary">
                {localThreshold} gCO₂/kWh
              </span>
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
              You'll be notified <span className="font-medium text-foreground">once</span> when intensity drops below {localThreshold} gCO₂/kWh, and <span className="font-medium text-foreground">once</span> when it rises back above — not on every change.
            </p>
            <div className="pt-4 mt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-sm font-medium">Live Accuracy Mode</div>
                  <p className="text-[10px] text-muted-foreground">
                    Periodically checks live data. {isNative ? '(Background Fetch)' : '(Tab must remain open)'}
                  </p>
                </div>
                <Switch
                  checked={prefs.useBackgroundFetch}
                  onCheckedChange={(checked) => updatePreference('useBackgroundFetch', checked)}
                />
              </div>
            </div>
            {prefs.useBackgroundFetch && (
              <p className="text-[10px] text-amber-500/80 pt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" /> {isNative ? 'May use slightly more battery.' : 'Only works while this tab is active.'}
              </p>
            )}
          </div>
        )
        }
      </Card >


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
          />
        </div>

        {prefs.highIntensityEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Alert when above:
              </span>
              <span className="font-medium text-destructive">
                {localHighThreshold} gCO₂/kWh
              </span>
            </div>
            <Slider
              value={[localHighThreshold]}
              onValueChange={([value]) => setLocalHighThreshold(value)}
              onValueCommit={([value]) => updatePreference('highIntensityThreshold', value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              You'll be notified <span className="font-medium text-foreground">once</span> when intensity rises above {localHighThreshold} gCO₂/kWh, and <span className="font-medium text-foreground">once</span> when it drops back below — not on every change.
            </p>
          </div>
        )}
      </Card>

      {/* Daily Forecast */}
      < Card className="p-4 space-y-4" >
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
          />
        </div>

        {
          prefs.dailyForecastEnabled && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Send at:
                </span>
                <input
                  type="time"
                  value={prefs.dailyForecastTime}
                  onChange={(e) => updatePreference('dailyForecastTime', e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
                />
              </div>
            </div>
          )
        }
      </Card >

      {/* Weekly Digest */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Weekly Digest</h3>
              <p className="text-sm text-muted-foreground">
                Summary of your carbon footprint & best times
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.weeklyDigestEnabled}
            onCheckedChange={handleWeeklyDigestToggle}
            disabled={!isSupported}
          />
        </div>

        {prefs.weeklyDigestEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Send every:
              </span>
              <Select
                value={prefs.weeklyDigestDay.toString()}
                onValueChange={(value) => updatePreference('weeklyDigestDay', parseInt(value))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Includes: total emissions, energy usage, green energy %, and best times to use electricity.
            </p>

            <WeeklyDigestPreview />
          </div>
        )}
      </Card>

      {/* Monthly Report */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Monthly Report</h3>
              <p className="text-sm text-muted-foreground">
                Detailed carbon analysis with trends
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.monthlyReportEnabled}
            onCheckedChange={handleMonthlyReportToggle}
            disabled={!isSupported}
          />
        </div>

        {prefs.monthlyReportEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Send on the:
              </span>
              <Select
                value={prefs.monthlyReportDay.toString()}
                onValueChange={(value) => updatePreference('monthlyReportDay', parseInt(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthDayOptions.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Includes: weekly trends, intensity breakdown, best/worst periods, and personalized insights.
            </p>

            <MonthlyReportPreview />
          </div>
        )}
      </Card>

      {
        !isSupported && (
          <p className="text-xs text-center text-muted-foreground">
            Notifications are not supported in this browser.
          </p>
        )
      }

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
                <p className="text-sm text-muted-foreground">
                  Show local weather conditions
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.showWeatherInInsights}
              onCheckedChange={(checked) => updatePreference('showWeatherInInsights', checked)}
            />
          </div>
        </Card>
      </div>
    </div >
  );
}
