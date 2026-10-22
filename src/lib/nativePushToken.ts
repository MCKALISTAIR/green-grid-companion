import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { logger } from '@/lib/logger';

/**
 * BH-73: the APNs/FCM token for this device, or null (web, permission not
 * granted, or no token within the timeout). Never prompts: the daily-outlook
 * switch already asked for notification permission.
 */
export async function getNativePushToken(timeoutMs = 8000): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') return null;
    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [];
    const tokenPromise = new Promise<string | null>((resolve) => {
      handles.push(
        PushNotifications.addListener('registration', (t: Token) => resolve(t.value || null)),
        PushNotifications.addListener('registrationError', () => resolve(null)),
      );
    });
    await PushNotifications.register();
    const token = await Promise.race([
      tokenPromise,
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    handles.forEach((h) => h.then((l) => l.remove()).catch(() => {}));
    return token;
  } catch (error) {
    logger.warn('Push token unavailable; daily outlook stays on the phone', { error });
    return null;
  }
}
