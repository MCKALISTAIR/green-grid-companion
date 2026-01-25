import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { logger } from '@/lib/logger';

export function useHaptics() {
  const isNative = Capacitor.isNativePlatform();

  const impact = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style });
    } catch (error) {
      logger.debug('Haptic impact failed', { error });
    }
  };

  const notification = async (type: NotificationType = NotificationType.Success) => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type });
    } catch (error) {
      logger.debug('Haptic notification failed', { error });
    }
  };

  const selectionStart = async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionStart();
    } catch (error) {
      logger.debug('Haptic selection start failed', { error });
    }
  };

  const selectionChanged = async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionChanged();
    } catch (error) {
      logger.debug('Haptic selection changed failed', { error });
    }
  };

  const selectionEnd = async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionEnd();
    } catch (error) {
      logger.debug('Haptic selection end failed', { error });
    }
  };

  // Convenience methods
  const lightTap = () => impact(ImpactStyle.Light);
  const mediumTap = () => impact(ImpactStyle.Medium);
  const heavyTap = () => impact(ImpactStyle.Heavy);
  const success = () => notification(NotificationType.Success);
  const warning = () => notification(NotificationType.Warning);
  const error = () => notification(NotificationType.Error);

  return {
    isNative,
    impact,
    notification,
    selectionStart,
    selectionChanged,
    selectionEnd,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    warning,
    error,
  };
}

// Re-export types for convenience
export { ImpactStyle, NotificationType };
