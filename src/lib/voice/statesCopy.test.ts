import { describe, expect, it } from 'vitest';
import { offlineBannerText } from './statesCopy';

describe('offline banner', () => {
  it('names the saved time in Europe/London', () => {
    expect(offlineBannerText(Date.parse('2026-10-11T11:19:00Z'))).toBe(
      "You're offline. Figures from 12:19.",
    );
  });
  it('says so when nothing is saved', () => {
    expect(offlineBannerText(null)).toBe("You're offline. Nothing saved yet.");
  });
});
