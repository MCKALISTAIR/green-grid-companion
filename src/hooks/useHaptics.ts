
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useCallback } from 'react';

export function useHaptics() {
  const isAvailable = Capacitor.isNativePlatform();

  const impactLight = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Fail silently
    }
  }, [isAvailable]);

  const impactMedium = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      // Fail silently
    }
  }, [isAvailable]);

  const impactHeavy = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      // Fail silently
    }
  }, [isAvailable]);

  const notification = useCallback(async (type: NotificationType) => {
    if (!isAvailable) return;
    try {
      await Haptics.notification({ type });
    } catch (e) {
      // Fail silently
    }
  }, [isAvailable]);

  const selection = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (e) {
      // Fail silently
    }
  }, [isAvailable]);

  return {
    impactLight,
    impactMedium,
    impactHeavy,
    notification,
    selection,
    isAvailable
  };
}
