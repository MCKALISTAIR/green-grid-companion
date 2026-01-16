import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Zap, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const postcode = localStorage.getItem('gridgreen-postcode') || '';

  const {
    isNative,
    isRegistered,
    permissionStatus,
    prefs,
    requestPermission,
    updatePreference,
  } = usePushNotifications(postcode);

  const handleLowIntensityToggle = async (enabled: boolean) => {
    let tokenOverride: string | undefined;
    if (enabled && permissionStatus !== 'granted') {
      const token = await requestPermission();
      if (!token) return; // Permission denied or failed
      tokenOverride = token;
    }
    updatePreference('lowIntensityEnabled', enabled, tokenOverride);
  };

  const handleDailyForecastToggle = async (enabled: boolean) => {
    let tokenOverride: string | undefined;
    if (enabled && permissionStatus !== 'granted') {
      const token = await requestPermission();
      if (!token) return;
      tokenOverride = token;
    }
    updatePreference('dailyForecastEnabled', enabled, tokenOverride);
  };

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

      {!isNative && (
        <Card className="p-4 bg-accent/30 border-accent/50">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-accent-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Native app required</p>
              <p className="text-xs text-muted-foreground">
                Install GridSense on your device for push notifications.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isNative && permissionStatus === 'denied' && (
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Notifications blocked</p>
              <p className="text-xs text-muted-foreground">
                Please enable notifications in your device settings.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isNative && permissionStatus === 'prompt' && (
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
            disabled={!isNative}
          />
        </div>

        {prefs.lowIntensityEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Alert when below:
              </span>
              <span className="font-medium text-primary">
                {prefs.lowIntensityThreshold} gCO₂/kWh
              </span>
            </div>
            <Slider
              value={[prefs.lowIntensityThreshold]}
              onValueCommit={([value]) => updatePreference('lowIntensityThreshold', value)}
              min={0}
              max={200}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0g (Very Low)</span>
              <span>200g (Moderate)</span>
            </div>
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
              <h3 className="font-medium text-foreground">Daily Forecast</h3>
              <p className="text-sm text-muted-foreground">
                Morning summary of today's outlook
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.dailyForecastEnabled}
            onCheckedChange={handleDailyForecastToggle}
            disabled={!isNative}
          />
        </div>

        {prefs.dailyForecastEnabled && (
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
        )}
      </Card>

      {isNative && isRegistered && (
        <p className="text-xs text-center text-muted-foreground">
          Your device is registered for push notifications. You'll receive alerts even when the app is closed.
        </p>
      )}

      {!isNative && (
        <p className="text-xs text-center text-muted-foreground">
          Push notifications require the native iOS/Android app. Settings are saved locally for now.
        </p>
      )}
    </div>
  );
}
