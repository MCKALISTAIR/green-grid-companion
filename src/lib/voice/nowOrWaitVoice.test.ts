import { describe, expect, it } from 'vitest';
import { getNowOrWaitDecision } from '@/lib/nowOrWait';
import { CHEEKY_TAILS, voiceNowOrWait } from './nowOrWaitVoice';

describe('voiceNowOrWait', () => {
  const noForecast = getNowOrWaitDecision(120, []);

  it('leaves the engine copy untouched in Plain', () => {
    const v = voiceNowOrWait(noForecast, 'plain');
    expect(v).toEqual({ headline: noForecast.headline, detail: noForecast.detail, tail: null });
  });

  it('keeps the live number in the Cheeky no-forecast line', () => {
    const v = voiceNowOrWait(noForecast, 'cheeky');
    expect(v.headline).toBe("Forecast's running late");
    expect(v.detail).toContain(`${noForecast.plan.nowAvg} gCO₂/kWh`);
  });

  it('only adds a tail in Cheeky and never changes the headline or detail', () => {
    for (const reason of ['cleaner_later', 'now_is_best', 'small_gain'] as const) {
      const fake = { ...noForecast, reason, headline: 'H', detail: 'D' };
      expect(voiceNowOrWait(fake, 'cheeky')).toEqual({ headline: 'H', detail: 'D', tail: CHEEKY_TAILS[reason] });
    }
  });

  it('has no tail for missing data', () => {
    expect(voiceNowOrWait({ ...noForecast, reason: 'missing_data' }, 'cheeky').tail).toBeNull();
  });

  it('uses no em dashes', () => {
    for (const t of Object.values(CHEEKY_TAILS)) expect(t).not.toMatch(/—/);
  });
});
