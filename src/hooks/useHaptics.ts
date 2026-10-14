import { ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useState } from 'react';
import {
  hapticImpact,
  hapticNotification,
  hapticSelection,
  isHapticsEnabled,
  setHapticsEnabled,
  subscribeHaptics,
  type HapticGateOptions,
} from '@/lib/haptics';

/**
 * Haptics, gated by Settings > Haptics and (for `decorative: true`) by Reduce Motion.
 * See src/lib/haptics.ts.
 */
export function useHaptics(opts: HapticGateOptions = {}) {
  const isAvailable = Capacitor.isNativePlatform();
  const decorative = !!opts.decorative;

  const impactLight = useCallback(
    () => hapticImpact(ImpactStyle.Light, { decorative }),
    [decorative],
  );
  const impactMedium = useCallback(
    () => hapticImpact(ImpactStyle.Medium, { decorative }),
    [decorative],
  );
  const impactHeavy = useCallback(
    () => hapticImpact(ImpactStyle.Heavy, { decorative }),
    [decorative],
  );
  const notification = useCallback(
    (type: NotificationType) => hapticNotification(type, { decorative }),
    [decorative],
  );
  const selection = useCallback(() => hapticSelection({ decorative }), [decorative]);

  return { impactLight, impactMedium, impactHeavy, notification, selection, isAvailable };
}

/** Settings > Haptics toggle state, shared across the app. */
export function useHapticsPreference() {
  const [enabled, setEnabled] = useState(isHapticsEnabled);
  useEffect(() => subscribeHaptics(setEnabled), []);
  const update = useCallback((on: boolean) => setHapticsEnabled(on), []);
  return { enabled, setEnabled: update };
}
