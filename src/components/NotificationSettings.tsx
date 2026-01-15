import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  onClose?: () => void;
}

interface NotificationPrefs {
  lowIntensityEnabled: boolean;
  lowIntensityThreshold: number;
  dailyForecastEnabled: boolean;
  dailyForecastTime: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  lowIntensityEnabled: false,
  lowIntensityThreshold: 100,
  dailyForecastEnabled: false,
  dailyForecastTime: '07:00',
};

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [notificationsSupported, setNotificationsSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem('gridgreen-notifications');
    if (saved) {
      setPrefs(JSON.parse(saved));
    }

    // Check notification support
    if (!('Notification' in window)) {
      setNotificationsSupported(false);
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!notificationsSupported) {
      toast.error('Notifications not supported', {
        description: 'Your browser does not support push notifications.',
      });
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      toast.success('Notifications enabled! 🎉', {
        description: "You'll be notified when carbon intensity is low.",
      });
    } else if (result === 'denied') {
      toast.error('Notifications blocked', {
        description: 'Please enable notifications in your browser settings.',
      });
    }
  };

  const savePrefs = (newPrefs: NotificationPrefs) => {
    setPrefs(newPrefs);
    localStorage.setItem('gridgreen-notifications', JSON.stringify(newPrefs));
    toast.success('Settings saved!');
  };

  const handleLowIntensityToggle = (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      requestPermission();
    }
    savePrefs({ ...prefs, lowIntensityEnabled: enabled });
  };

  const handleDailyForecastToggle = (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      requestPermission();
    }
    savePrefs({ ...prefs, dailyForecastEnabled: enabled });
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        {permission !== 'granted' && (
          <Button
            variant="outline"
            size="sm"
            onClick={requestPermission}
            className="gap-2"
          >
            <Bell className="w-4 h-4" />
            Enable
          </Button>
        )}
      </div>

      {!notificationsSupported && (
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">
              Notifications are not supported in your browser.
            </p>
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
              onValueChange={([value]) => savePrefs({ ...prefs, lowIntensityThreshold: value })}
              min={0}
              max={200}
              step={1}
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
                onChange={(e) => savePrefs({ ...prefs, dailyForecastTime: e.target.value })}
                className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
              />
            </div>
          </div>
        )}
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Note: For push notifications to work, this app needs to remain installed as a PWA or the browser needs to stay running in the background.
      </p>
    </div>
  );
}