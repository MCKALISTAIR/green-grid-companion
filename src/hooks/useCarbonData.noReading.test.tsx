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
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};
const never = () => new Promise<never>(() => {});

describe('useCarbonData: no fake 0 / moderate before a reading', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getAllRegions.mockResolvedValue([]);
    api.getNationalHistoryAndForecast.mockResolvedValue([]);
    api.getRegionalHistoryAndForecast.mockResolvedValue([]);
    api.getGenerationMix.mockResolvedValue([]);
  });

  it('stays loading while a postcode lookup and the national fallback are pending', async () => {
    api.getCurrentIntensity.mockImplementation(never);
    api.getRegionalIntensity.mockImplementation(never);
    const { result } = renderHook(() => useCarbonData('QQ9 9QQ'), { wrapper: wrapper() });
    await waitFor(() => expect(api.getAllRegions).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('shows the real national reading once it arrives', async () => {
    api.getCurrentIntensity.mockResolvedValue({ from: 'a', to: 'b', intensity: { forecast: 150, actual: null, index: 'moderate' } });
    const { result } = renderHook(() => useCarbonData(''), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.intensity).toBe(150);
    expect(result.current.isError).toBe(false);
  });

  it('prefers NESO actual over forecast for the national live reading', async () => {
    api.getCurrentIntensity.mockResolvedValue({
      from: 'a',
      to: 'b',
      intensity: { forecast: 147, actual: 160, index: 'moderate' },
    });
    const { result } = renderHook(() => useCarbonData(''), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.intensity).toBe(160);
  });

  it('is an error (not 0) when the fetch fails', async () => {
    api.getCurrentIntensity.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useCarbonData(''), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it('is an error when the API answers with no number', async () => {
    api.getCurrentIntensity.mockResolvedValue({ from: 'a', to: 'b', intensity: { forecast: null, actual: null, index: null } });
    const { result } = renderHook(() => useCarbonData(''), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });
});
