/**
 * One gate for every haptic in the app.
 *
 * - Native only (@capacitor/haptics is a no-op on the web).
 * - Settings > Haptics: On (default) / Off, stored in localStorage.
 * - Decorative haptics (scene taps, celebrations) are also skipped when the
 *   system asks for reduced motion. Meaningful ones (errors, the first number,
 *   the grid getting cleaner) still fire while Haptics is On.
 */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const HAPTICS_STORAGE_KEY = 'gridsense-haptics';
const listeners = new Set<(on: boolean) => void>();

export function isHapticsEnabled(): boolean {
  try {
    return localStorage.getItem(HAPTICS_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    localStorage.setItem(HAPTICS_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(on));
}

export function subscribeHaptics(listener: (on: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export interface HapticGateOptions {
  /** Scene taps, celebrations and other nice-to-haves: skipped under Reduce Motion. */
  decorative?: boolean;
}

/** True when a haptic of this kind may fire right now. */
export function canHaptic(
  opts: HapticGateOptions = {},
  isNative = Capacitor.isNativePlatform(),
): boolean {
  if (!isNative) return false;
  if (!isHapticsEnabled()) return false;
  if (opts.decorative && prefersReducedMotion()) return false;
  return true;
}

async function safely(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch {
    /* fail silently */
  }
}

export async function hapticImpact(style: ImpactStyle, opts?: HapticGateOptions): Promise<void> {
  if (!canHaptic(opts)) return;
  await safely(() => Haptics.impact({ style }));
}

export async function hapticNotification(
  type: NotificationType,
  opts?: HapticGateOptions,
): Promise<void> {
  if (!canHaptic(opts)) return;
  await safely(() => Haptics.notification({ type }));
}

export async function hapticSelection(opts?: HapticGateOptions): Promise<void> {
  if (!canHaptic(opts)) return;
  await safely(async () => {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  });
}

export async function hapticSelectionChanged(opts?: HapticGateOptions): Promise<void> {
  if (!canHaptic(opts)) return;
  await safely(() => Haptics.selectionChanged());
}
