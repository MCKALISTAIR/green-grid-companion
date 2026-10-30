import { describe, expect, it } from 'vitest';
import { isFramed, shouldBlockFraming } from './frameGuard';

const win = (hostname: string, framed: boolean) => {
  const self = {};
  return { self, top: framed ? {} : self, location: { hostname } };
};

describe('frameGuard (BH-151)', () => {
  it('blocks the production host inside a frame', () => {
    expect(shouldBlockFraming(win('getgridsense.com', true))).toBe(true);
    expect(shouldBlockFraming(win('WWW.getgridsense.com', true))).toBe(true);
  });
  it('allows the production host at top level', () => {
    expect(shouldBlockFraming(win('getgridsense.com', false))).toBe(false);
  });
  it('allows Lovable previews and localhost in a frame', () => {
    expect(shouldBlockFraming(win('abc.lovableproject.com', true))).toBe(false);
    expect(shouldBlockFraming(win('localhost', true))).toBe(false);
  });
  it('treats a cross-origin top that throws as framed', () => {
    const w = {
      self: {},
      get top(): unknown {
        throw new Error('SecurityError');
      },
      location: { hostname: 'getgridsense.com' },
    };
    expect(isFramed(w)).toBe(true);
    expect(shouldBlockFraming(w)).toBe(true);
  });
});
