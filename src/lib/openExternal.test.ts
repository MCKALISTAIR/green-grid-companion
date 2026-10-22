import { describe, it, expect } from 'vitest';
import { isExternalHref } from './openExternal';

describe('isExternalHref', () => {
  const o = 'https://gridsense-app.lovable.app';
  it('flags other-origin http(s) links', () => {
    expect(isExternalHref('https://carbonintensity.org.uk', o)).toBe(true);
  });
  it('ignores same-origin, mailto and relative links', () => {
    expect(isExternalHref('/privacy', o)).toBe(false);
    expect(isExternalHref(`${o}/terms`, o)).toBe(false);
    expect(isExternalHref('mailto:a@b.com', o)).toBe(false);
  });
});
