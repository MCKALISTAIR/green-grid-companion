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

import { useCarbonData } from './useCarbonData';

const wrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

const regional = (forecast: number, index: string) => ({
  regionid: 16,
  shortname: 'South Scotland',
  data: [{ from: 'a', to: 'b', intensity: { forecast, index }, generationmix: [] }],
});

describe('useCarbonData: label band comes from the grams (NESO 2026 bands)', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getAllRegions.mockResolvedValue([]);
    api.getNationalHistoryAndForecast.mockResolvedValue([]);
    api.getRegionalHistoryAndForecast.mockResolvedValue([]);
    api.getGenerationMix.mockResolvedValue([]);
    api.getCurrentIntensity.mockResolvedValue({
      from: 'a',
      to: 'b',
      intensity: { forecast: 100, actual: null, index: 'low' },
    });
  });

  it('labels 100 g as moderate even when NESO says low', async () => {
    api.getRegionalIntensityById.mockResolvedValue(regional(100, 'low'));
    const { result } = renderHook(() => useCarbonData('Scotland'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.intensity).toBe(100));
    expect(result.current.index).toBe('moderate');
  });

  it('labels 175 g as high even when NESO says moderate', async () => {
    api.getRegionalIntensityById.mockResolvedValue(regional(175, 'moderate'));
    const { result } = renderHook(() => useCarbonData('Scotland'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.intensity).toBe(175));
    expect(result.current.index).toBe('high');
  });
});
