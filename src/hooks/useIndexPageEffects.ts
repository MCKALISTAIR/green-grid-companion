import { useEffect, useRef } from 'react';
import { NotificationType } from '@capacitor/haptics';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { ForecastData } from '@/lib/carbonApi';
import { usePeriodicRefresh } from '@/hooks/usePeriodicRefresh';
import { useProductTour } from '@/hooks/useProductTour';
import { useHaptics } from '@/hooks/useHaptics';
import {
  consumeFirstNumber,
  countSession,
  getNudgeAnswer,
  hasUsefulMoment,
  markReadingShown,
  setNudgeAnswer,
  shouldNudgeNotifications,
} from '@/lib/firstLaunch';
import { NOTIFICATION_NUDGE_COPY } from '@/lib/voice/onboardingCopy';
import { requestOverlay } from '@/lib/overlayQueue';

export interface NotificationNudgeDeps {
  isSupported: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied';
  alertsAlreadyOn: boolean;
  requestPermission: () => Promise<boolean>;
  enableCleanAlerts: () => void;
}

interface IndexPageEffectsOptions {
  postcode: string;
  intensity: number;
  isLoading: boolean;
  lastUpdated: string | undefined;
  forecast: ForecastData[];
  refetch: () => void;
  scheduleGreenAlerts: (forecast: ForecastData[]) => void;
  scheduleDailyForecast: (forecast: ForecastData[]) => void;
  scheduleHighIntensityAlerts: (forecast: ForecastData[]) => void;
  /** True when the data request failed (so a stale/zero value isn't treated as a reading). */
  isError?: boolean;
  /** Notification ask after the first useful moment. Omit to never ask. */
  notificationNudge?: NotificationNudgeDeps;
}

export function useIndexPageEffects({
  postcode,
  isLoading,
  lastUpdated,
  forecast,
  refetch,
  scheduleGreenAlerts,
  scheduleDailyForecast,
  scheduleHighIntensityAlerts,
  isError = false,
  notificationNudge,
}: IndexPageEffectsOptions) {
  const navigate = useNavigate();

  // Redirect to onboarding if no postcode
  useEffect(() => {
    if (!postcode) {
      navigate('/onboarding');
    }
  }, [postcode, navigate]);

  // Auto-schedule notifications when forecast updates
  useEffect(() => {
    if (forecast && forecast.length > 0) {
      scheduleGreenAlerts(forecast);
      scheduleDailyForecast(forecast);
      scheduleHighIntensityAlerts(forecast);
    }
  }, [forecast, scheduleGreenAlerts, scheduleDailyForecast, scheduleHighIntensityAlerts]);

  // A real reading is on screen (0 is a real reading in wind/nuclear-heavy regions).
  const hasReading = !!postcode && !isLoading && !isError && !!lastUpdated;

  // First number after onboarding: one Success haptic, then the two optional tips.
  const { startTour } = useProductTour();
  const { notification } = useHaptics();
  useEffect(() => {
    if (!hasReading) return;
    markReadingShown(); // the privacy sheet waits for this, then the tips wait for it
    if (consumeFirstNumber()) void notification(NotificationType.Success);
    startTour();
  }, [hasReading, startTour, notification]);

  // Ask about notifications only after a useful moment (Plan a load tapped, or a
  // second session), once, and only while the OS hasn't been asked yet.
  const sessionsRef = useRef<number | null>(null);
  if (sessionsRef.current === null) sessionsRef.current = countSession();
  const nudgeShownRef = useRef(false);
  useEffect(() => {
    if (!hasReading || !notificationNudge || nudgeShownRef.current) return;
    if (localStorage.getItem('product_tour_seen') !== 'true') return; // don't stack on the tips
    const ok = shouldNudgeNotifications({
      sessions: sessionsRef.current ?? 0,
      usefulMoment: hasUsefulMoment(),
      answered: getNudgeAnswer() !== null,
      permission: notificationNudge.permissionStatus,
      supported: notificationNudge.isSupported,
      alertsAlreadyOn: notificationNudge.alertsAlreadyOn,
    });
    if (!ok) return;
    nudgeShownRef.current = true;
    const { requestPermission, enableCleanAlerts } = notificationNudge;
    const c = NOTIFICATION_NUDGE_COPY;
    // Wait for our turn: never on top of the privacy choice or the tips.
    const turn = requestOverlay('other', 'notification-nudge');
    turn.whenActive(() => {
      toast(c.title, {
        description: c.body,
        duration: 15000,
        onDismiss: () => turn.release(),
        onAutoClose: () => turn.release(),
        action: {
          label: c.yes,
          onClick: async () => {
            turn.release();
            setNudgeAnswer('yes');
            // Only now does the OS prompt appear.
            const granted = await requestPermission();
            if (granted) {
              enableCleanAlerts();
              toast.success(c.enabled);
            } else {
              toast(c.blocked);
            }
          },
        },
        cancel: {
          label: c.no,
          onClick: () => {
            turn.release();
            setNudgeAnswer('no');
          },
        },
      });
    });
  }, [hasReading, notificationNudge]);

  // Periodic stale data refresh
  usePeriodicRefresh(lastUpdated ?? null, refetch);
}
