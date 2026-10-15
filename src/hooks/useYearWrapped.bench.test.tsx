import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYearWrapped } from './useYearWrapped';
import * as carbonApi from '@/lib/carbonApi';

// Mock the API module
vi.mock('@/lib/carbonApi', async () => {
  const actual = await vi.importActual('@/lib/carbonApi');
  return {
    ...actual,
    getNationalHistoryAndForecast: vi.fn(),
  };
});

describe('useYearWrapped Benchmark', () => {
  it('measures fetchYearData execution time', async () => {
    // Mock implementation with delay
    const mockGetNationalHistoryAndForecast = vi.mocked(carbonApi.getNationalHistoryAndForecast);

    // Return dummy data
    const dummyData = [
      {
        from: '2023-01-01T00:00Z',
        to: '2023-01-01T00:30Z',
        intensity: { forecast: 100, actual: 100, index: 'moderate' },
        generationmix: [
          { fuel: 'wind', perc: 50 },
          { fuel: 'gas', perc: 50 },
        ],
      },
    ];

    mockGetNationalHistoryAndForecast.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms network delay per request
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return dummyData as any;
    });

    const { result } = renderHook(() => useYearWrapped());

    const startTime = performance.now();

    await act(async () => {
      await result.current.fetchYearData(2023);
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`fetchYearData took ${duration.toFixed(2)}ms`);

    if (result.current.error) {
      console.error('Error in hook:', result.current.error);
    }

    // Verify data was processed
    expect(result.current.error).toBeNull();
    expect(result.current.data).not.toBeNull();
  });
});
