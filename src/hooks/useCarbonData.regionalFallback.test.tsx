import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({
  getCurrentIntensity: vi.fn(),
  getAllRegions: vi.fn(),
  getRegionalIntensityById: vi.fn(),
  getRegionalIntensity: vi.fn(),
  getNationalHistoryAndForecast: vi.fn(),
  getRegionalHistoryAndForecast: vi.fn(),
  getGenerationMix: vi.fn(),
}));
vi.mock('@/lib/carbonApi', async (orig) => ({ ...(await orig<object>()), ...api }));

import { useCarbonData, REGIONAL_FALLBACK_LABEL } from './useCarbonData';

const wrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

const gbMix = [{ fuel: 'gas', perc: 40 }];
const scotMix = [{ fuel: 'wind', perc: 90 }];
const regional = (forecast: number | null) => ({
  regionid: 16,
  shortname: 'South Scotland',
  data: [
    {
      from: 'a',
      to: 'b',
      intensity: { forecast, index: forecast === null ? 'very low' : 'very low' },
      generationmix: scotMix,
    },
  ],
});

describe('useCarbonData: BH-29 regional figure missing', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getAllRegions.mockResolvedValue([]);
    api.getNationalHistoryAndForecast.mockResolvedValue([]);
    api.getRegionalHistoryAndForecast.mockResolvedValue([]);
    api.getGenerationMix.mockResolvedValue(gbMix);
    api.getCurrentIntensity.mockResolvedValue({
      from: 'a',
      to: 'b',
      intensity: { forecast: 150, actual: null, index: 'moderate' },
    });
  });

  it('labels the GB number as GB, with the GB index and mix, never the region name', async () => {
    api.getRegionalIntensityById.mockResolvedValue(regional(null));
    const { result } = renderHook(() => useCarbonData('Scotland'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.usingNationalFallback).toBe(true));
    expect(result.current.intensity).toBe(150);
    expect(result.current.region).toBe(REGIONAL_FALLBACK_LABEL);
    expect(result.current.index).toBe('moderate');
    expect(result.current.generationMix).toEqual(gbMix);
  });

  it('keeps the region name, index and mix when the regional figure is there', async () => {
    api.getRegionalIntensityById.mockResolvedValue(regional(10));
    const { result } = renderHook(() => useCarbonData('Scotland'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.intensity).toBe(10));
    expect(result.current.usingNationalFallback).toBe(false);
    expect(result.current.region).toBe('South Scotland');
    expect(result.current.index).toBe('very low');
    expect(result.current.generationMix).toEqual(scotMix);
  });
});
