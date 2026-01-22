import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Zap, Smartphone, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';

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

  const handleLowIntensityToggle = async (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    updatePreference('lowIntensityEnabled', enabled);
  };

  // Local state for slider to ensure smooth dragging without constant storage writes
  const [localThreshold, setLocalThreshold] = useState(prefs.lowIntensityThreshold);

  useEffect(() => {
    setLocalThreshold(prefs.lowIntensityThreshold);
  }, [prefs.lowIntensityThreshold]);

  const handleDailyForecastToggle = async (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    updatePreference('dailyForecastEnabled', enabled);
  };

  const handleWeeklyDigestToggle = async (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    updatePreference('weeklyDigestEnabled', enabled);
  };

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

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

      {/* Permissions blocked */}
      {isSupported && permissionStatus === 'denied' && (
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Notifications blocked</p>
              <p className="text-xs text-muted-foreground">
                Please enable notifications in your browser/device settings.
              </p>
            </div>
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

      {/* Low Intensity Alert */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-intensity-very-low/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-intensity-very-low" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Low Intensity Alert</h3>
              <p className="text-sm text-muted-foreground">
                Get notified when it's a good time to charge
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

      {/* Daily Forecast */}
      < Card className="p-4 space-y-4" >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Daily Forecast</h3>
              <p className="text-sm text-muted-foreground">
                Morning summary of today's outlook
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
          </div>
        )}
      </Card>

      {isSupported && permissionStatus === 'granted' && prefs.lowIntensityEnabled && (
        <p className="text-xs text-center text-muted-foreground">
          You'll receive alerts when grid intensity is favorable.
        </p>
      )}

      {
        !isSupported && (
          <p className="text-xs text-center text-muted-foreground">
            Notifications are not supported in this browser.
          </p>
        )
      }
    </div >
  );
}
