/**
 * Push subscription cleanup for dead device tokens.
 *
 * isDeadPushToken: true only when the push service says the token is permanently
 * dead (app deleted / notifications turned off for good): APNs 410 "Unregistered",
 * FCM 404 "UNREGISTERED". Other errors (e.g. APNs 400 BadDeviceToken, which a
 * sandbox/production mix-up also causes) are NOT treated as dead, so a config
 * mistake can't wipe valid subscriptions.
 */
export function isDeadPushToken(service: 'apns' | 'fcm', status: number, body: string): boolean {
  if (service === 'apns') return status === 410;
  return status === 404 && /UNREGISTERED/i.test(body);
}

/** Delete subscriptions whose tokens were reported dead. Never throws. */
export async function removeDeadPushTokens(
  tokens: string[],
  deleteFn: (tokens: string[]) => PromiseLike<{ error: { message: string } | null }>,
  log: { info: (m: string) => void; error: (m: string, e?: unknown) => void } = {
    info: (m) => console.log(m),
    error: (m, e) => console.error(m, e),
  },
): Promise<number> {
  const unique = [...new Set(tokens)].filter(Boolean);
  if (unique.length === 0) return 0;
  try {
    const { error } = await deleteFn(unique);
    if (error) {
      log.error('[PUSH] Failed to remove dead push tokens:', error.message);
      return 0;
    }
    log.info(`[PUSH] Removed ${unique.length} subscription(s) with dead tokens`);
    return unique.length;
  } catch (e) {
    log.error('[PUSH] Error removing dead push tokens:', e);
    return 0;
  }
}
