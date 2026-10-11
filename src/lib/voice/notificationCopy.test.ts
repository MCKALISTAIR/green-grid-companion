import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  cleanWindowNotification,
  dailyOutlookBody,
  highWindowNotification,
  liveCleanNotification,
} from './notificationCopy';

// 13:00 BST on 11 Oct 2026 (12:00 UTC)
const START = new Date('2026-10-11T12:00:00Z');

describe('notification copy', () => {
  it('shows times in Europe/London and the full unit', () => {
    const n = cleanWindowNotification(START, 42, 100, 'plain');
    expect(n.title).toBe('Clean window from 13:00');
    expect(n.body).toBe('42 gCO₂/kWh forecast, under your 100 gCO₂/kWh alert. A good time for big loads.');
  });

  it('keeps numbers and title identical across tones', () => {
    const a = highWindowNotification(START, 280, 250, 'plain');
    const b = highWindowNotification(START, 280, 250, 'cheeky');
    expect(a.title).toBe(b.title);
    expect(b.body.startsWith('280 gCO₂/kWh forecast, over your 250 gCO₂/kWh alert.')).toBe(true);
    expect(a.body).not.toBe(b.body);
  });

  it('keeps titles short', () => {
    for (const n of [
      liveCleanNotification(999, 100, 'cheeky'),
      cleanWindowNotification(START, 999, 100, 'cheeky'),
      highWindowNotification(START, 999, 250, 'cheeky'),
    ]) {
      expect(n.title.length).toBeLessThanOrEqual(40);
    }
  });

  it('writes the daily outlook with London times', () => {
    expect(
      dailyOutlookBody({
        avg: 120,
        cleanHours: 3.5,
        threshold: 100,
        best: { start: START, end: new Date('2026-10-11T15:00:00Z'), hours: 3 },
      }),
    ).toBe('Average forecast today: 120 gCO₂/kWh. 3.5 hours under your 100 gCO₂/kWh alert. Cleanest stretch: 13:00 to 16:00.');
    expect(dailyOutlookBody({ avg: 300, cleanHours: 0, threshold: 100, best: null })).toBe(
      'Average forecast today: 300 gCO₂/kWh. No half hours under your 100 gCO₂/kWh alert today.',
    );
  });

  it('has no em dashes in push or local notification copy', () => {
    for (const f of [
      'src/lib/voice/notificationCopy.ts',
      'supabase/functions/check-carbon-intensity/index.ts',
      'supabase/functions/daily-forecast/index.ts',
    ]) {
      const src = readFileSync(resolve(__dirname, '../../..', f), 'utf-8');
      const strings = src.match(/(['`])(?:(?!\1).)*\1/g) ?? [];
      expect(strings.filter((s) => s.includes('—'))).toEqual([]);
    }
  });
});
