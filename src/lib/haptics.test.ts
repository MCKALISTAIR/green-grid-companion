import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canHaptic, isHapticsEnabled, setHapticsEnabled, subscribeHaptics } from './haptics';

function setReducedMotion(on: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: on && q.includes('reduce'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('haptics gate', () => {
  beforeEach(() => {
    localStorage.clear();
    setReducedMotion(false);
  });

  it('is on by default and never fires on the web', () => {
    expect(isHapticsEnabled()).toBe(true);
    expect(canHaptic({}, false)).toBe(false);
    expect(canHaptic({}, true)).toBe(true);
  });

  it('Settings > Haptics Off stops everything', () => {
    setHapticsEnabled(false);
    expect(canHaptic({}, true)).toBe(false);
    expect(canHaptic({ decorative: true }, true)).toBe(false);
  });

  it('Reduce Motion skips decorative haptics only', () => {
    setReducedMotion(true);
    expect(canHaptic({ decorative: true }, true)).toBe(false);
    expect(canHaptic({}, true)).toBe(true);
  });

  it('notifies listeners so the toggle stays in sync', () => {
    const seen: boolean[] = [];
    const off = subscribeHaptics((on) => seen.push(on));
    setHapticsEnabled(false);
    setHapticsEnabled(true);
    off();
    setHapticsEnabled(false);
    expect(seen).toEqual([false, true]);
  });
});
