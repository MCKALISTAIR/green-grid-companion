import { describe, it, expect, vi } from 'vitest';
import { installStaleChunkReload, STALE_CHUNK_RELOAD_KEY } from './staleChunkReload';

function setup(t = 1_000_000, init: Record<string, string> = {}) {
  const target = new EventTarget();
  const m = new Map(Object.entries(init));
  const storage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
  const reload = vi.fn();
  let clock = t;
  installStaleChunkReload({
    target: target as unknown as Window,
    storage,
    reload,
    now: () => clock,
  });
  const fire = () => {
    const e = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(e);
    return e;
  };
  return { fire, reload, m, advance: (ms: number) => (clock += ms) };
}

describe('installStaleChunkReload (BH-131)', () => {
  it('reloads once on a stale chunk and suppresses the error', () => {
    const s = setup();
    const e = s.fire();
    expect(s.reload).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
    expect(s.m.get(STALE_CHUNK_RELOAD_KEY)).toBe('1000000');
  });

  it('does not loop: a second failure right after the reload is left to show', () => {
    const s = setup(1_000_000, { [STALE_CHUNK_RELOAD_KEY]: String(1_000_000 - 5_000) });
    const e = s.fire();
    expect(s.reload).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('reloads again for a later deploy', () => {
    const s = setup();
    s.fire();
    s.advance(60_000);
    s.fire();
    expect(s.reload).toHaveBeenCalledTimes(2);
  });
});
