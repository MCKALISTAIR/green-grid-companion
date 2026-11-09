/** How long "Back online" stays before fading (motion spec §2.7). */
export const BACK_ONLINE_MS = 1600;

/** How often the offline pill rechecks the day band (UK midnight rollover). */
export const PILL_TICK_MS = 60_000;

/** One Warning haptic per app session, not per drop. */
export const offlineWarningState = { warnedThisSession: false };
export function resetOfflineWarningForTests() {
  offlineWarningState.warnedThisSession = false;
}
