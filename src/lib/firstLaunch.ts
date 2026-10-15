import { appStorage } from './appStorage';
/**
 * First-launch bookkeeping: the one Success haptic when the first real number
 * arrives, and when it's fair to ask about notifications.
 */
const FIRST_NUMBER_KEY = 'gridsense-first-number-pending';
const SESSIONS_KEY = 'gridsense-session-count';
const SESSION_FLAG = 'gridsense-session-counted';
const USEFUL_KEY = 'gridsense-useful-moment';
const NUDGE_KEY = 'gridsense-notification-nudge';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function markFirstNumberPending(): void {
  safe(() => appStorage.setItem(FIRST_NUMBER_KEY, '1'), undefined);
}

/** True once: the first time it's called after onboarding. */
export function consumeFirstNumber(): boolean {
  return safe(() => {
    if (appStorage.getItem(FIRST_NUMBER_KEY) !== '1') return false;
    appStorage.removeItem(FIRST_NUMBER_KEY);
    return true;
  }, false);
}

/** Count app sessions (once per tab/app launch). Returns the count. */
export function countSession(): number {
  return safe(() => {
    const n = Number(appStorage.getItem(SESSIONS_KEY) ?? '0') || 0;
    if (sessionStorage.getItem(SESSION_FLAG)) return n;
    sessionStorage.setItem(SESSION_FLAG, '1');
    appStorage.setItem(SESSIONS_KEY, String(n + 1));
    return n + 1;
  }, 0);
}

/** Record a "first useful moment" (e.g. they tapped Plan a load). */
export function markUsefulMoment(): void {
  safe(() => appStorage.setItem(USEFUL_KEY, '1'), undefined);
}

export function hasUsefulMoment(): boolean {
  return safe(() => appStorage.getItem(USEFUL_KEY) === '1', false);
}

export type NudgeAnswer = 'yes' | 'no';

export function getNudgeAnswer(): NudgeAnswer | null {
  return safe(() => (appStorage.getItem(NUDGE_KEY) as NudgeAnswer | null) ?? null, null);
}

export function setNudgeAnswer(answer: NudgeAnswer): void {
  safe(() => appStorage.setItem(NUDGE_KEY, answer), undefined);
}

/**
 * Ask about notifications only after something useful has happened: the user
 * has opened Plan from the home card, or this is at least their second session.
 * Never on first launch, never twice, and never when the OS has already answered.
 */
export function shouldNudgeNotifications(opts: {
  sessions: number;
  usefulMoment: boolean;
  answered: boolean;
  permission: 'prompt' | 'granted' | 'denied';
  supported: boolean;
  alertsAlreadyOn: boolean;
}): boolean {
  if (!opts.supported || opts.answered || opts.alertsAlreadyOn) return false;
  if (opts.permission !== 'prompt') return false;
  return opts.usefulMoment || opts.sessions >= 2;
}

/* ---- "The number is on screen" signal: the privacy sheet waits for it on home ---- */
const READING_SHOWN_EVENT = 'gridsense:reading-shown';
let readingShown = false;

export function markReadingShown(): void {
  if (readingShown) return;
  readingShown = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(READING_SHOWN_EVENT));
}

export function hasReadingShown(): boolean {
  return readingShown;
}

export function onReadingShown(cb: () => void): () => void {
  if (readingShown) {
    cb();
    return () => {};
  }
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(READING_SHOWN_EVENT, cb, { once: true });
  return () => window.removeEventListener(READING_SHOWN_EVENT, cb);
}
