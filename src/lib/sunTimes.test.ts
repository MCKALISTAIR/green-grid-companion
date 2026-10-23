import { describe, expect, it } from 'vitest';
import { getSunTimes, timeOfDayFromSun } from './sunTimes';

const london = { lat: 51.51, lon: -0.13 };
const lerwick = { lat: 60.15, lon: -1.15 };
const hm = (d: Date | null) =>
  d!.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
const mins = (a: string, b: string) => {
  const [x, y] = [a, b].map((s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3)));
  return Math.abs(x - y);
};

describe('getSunTimes', () => {
  // Reference: timeanddate.com, London.
  it.each([
    ['2026-06-21T12:00:00Z', '04:43', '21:21'],
    ['2026-12-21T12:00:00Z', '08:03', '15:53'],
    ['2026-10-15T12:00:00Z', '07:22', '18:09'],
  ])('London %s within 4 min', (iso, rise, set) => {
    const s = getSunTimes(new Date(iso), london.lat, london.lon);
    expect(mins(hm(s.sunrise), rise)).toBeLessThanOrEqual(4);
    expect(mins(hm(s.sunset), set)).toBeLessThanOrEqual(4);
  });

  it('Lerwick midwinter day is short but still has a sunrise', () => {
    const s = getSunTimes(new Date('2026-12-21T12:00:00Z'), lerwick.lat, lerwick.lon);
    expect(s.sunrise && s.sunset).toBeTruthy();
    expect((s.sunset!.getTime() - s.sunrise!.getTime()) / 3600000).toBeLessThan(6.5);
  });
});

describe('timeOfDayFromSun', () => {
  const at = (iso: string, c = london) =>
    timeOfDayFromSun(new Date(iso), getSunTimes(new Date(iso), c.lat, c.lon));
  it('follows the season, not the clock', () => {
    // 17:30 BST in October is sunset; 17:30 in June is still afternoon.
    expect(at('2026-10-15T16:45:00Z')).toBe('sunset');
    expect(at('2026-06-21T16:30:00Z')).toBe('afternoon');
    // 16:30 GMT on the winter solstice is already dusk; 21:00 BST in June is sunset.
    expect(at('2026-12-21T16:30:00Z')).toBe('dusk');
    expect(at('2026-06-21T20:00:00Z')).toBe('sunset');
  });
  it('covers the whole day in order', () => {
    const seq = Array.from({ length: 96 }, (_, i) =>
      at(new Date(Date.UTC(2026, 9, 15) + i * 15 * 60000).toISOString()),
    );
    const order = ['night', 'dawn', 'morning', 'midday', 'afternoon', 'sunset', 'dusk', 'night'];
    const collapsed = seq.filter((t, i) => i === 0 || t !== seq[i - 1]);
    expect(collapsed).toEqual(order);
  });
  it('handles a short Shetland winter day', () => {
    const seq = Array.from({ length: 96 }, (_, i) =>
      at(new Date(Date.UTC(2026, 11, 21) + i * 15 * 60000).toISOString(), lerwick),
    );
    expect(new Set(seq)).toContain('midday');
    expect(seq[0]).toBe('night');
  });
});
