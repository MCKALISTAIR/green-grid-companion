import { describe, it, expect, vi } from 'vitest';
import {
  fetchNationalIntensity,
  parseNationalIntensity,
  toIntensityReading,
} from '../../../supabase/functions/_shared/intensity-reading.ts';

describe('push notification intensity readings', () => {
  it('accepts real readings and prefers published actual over forecast', () => {
    expect(toIntensityReading({ forecast: 74, index: 'low' })).toEqual({ intensity: 74, index: 'low' });
    expect(toIntensityReading({ forecast: 0, index: 'very low' })).toEqual({ intensity: 0, index: 'very low' });
    expect(toIntensityReading({ forecast: 147, actual: 160, index: 'moderate' }))
      .toEqual({ intensity: 160, index: 'moderate' });
    expect(parseNationalIntensity({ data: [{ intensity: { forecast: 150, actual: null, index: 'moderate' } }] }))
      .toEqual({ intensity: 150, index: 'moderate' });
    expect(parseNationalIntensity({ data: [{ intensity: { forecast: 147, actual: 160, index: 'moderate' } }] }))
      .toEqual({ intensity: 160, index: 'moderate' });
  });

  it('rejects missing or malformed data instead of inventing 200 / moderate', () => {
    expect(toIntensityReading({ index: 'low' })).toBeNull();
    expect(toIntensityReading({ forecast: null, index: 'low' })).toBeNull();
    expect(toIntensityReading({ forecast: 120 })).toBeNull();
    expect(toIntensityReading({ forecast: 120, index: 'unknown' })).toBeNull();
    expect(parseNationalIntensity({ data: [] })).toBeNull();
    expect(parseNationalIntensity(null)).toBeNull();
  });

  it('returns null and logs on HTTP error or network failure', async () => {
    const log = vi.fn();
    const http500 = vi.fn().mockResolvedValue(new Response('oops', { status: 500 }));
    expect(await fetchNationalIntensity(http500 as unknown as typeof fetch, log)).toBeNull();
    const boom = vi.fn().mockRejectedValue(new Error('network down'));
    expect(await fetchNationalIntensity(boom as unknown as typeof fetch, log)).toBeNull();
    const emptyBody = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    expect(await fetchNationalIntensity(emptyBody as unknown as typeof fetch, log)).toBeNull();
    expect(log).toHaveBeenCalledTimes(3);
  });

  it('check-carbon-intensity no longer has a hard-coded fallback reading', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../../../supabase/functions/check-carbon-intensity/index.ts'), 'utf-8');
    expect(src).not.toMatch(/\|\|\s*200\b/);
    expect(src).not.toMatch(/\|\|\s*'moderate'/);
    expect(src).toMatch(/skippedNoData\+\+/);
  });
});
