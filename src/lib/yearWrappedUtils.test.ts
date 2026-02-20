import { describe, it, expect } from 'vitest';
import { processYearData } from './yearWrappedUtils';
import { ForecastData } from './carbonApi';

// Helper to create mock data
const createMockData = (date: string, intensity: number, mix: { fuel: string; perc: number }[]): ForecastData => ({
    from: date,
    to: date, // not used in logic
    intensity: {
        forecast: intensity,
        actual: intensity,
        index: 'moderate'
    },
    generationmix: mix
});

describe('processYearData', () => {
    it('should correctly process basic stats', () => {
        const data: ForecastData[] = [
            createMockData('2023-01-01T12:00:00Z', 100, [
                { fuel: 'wind', perc: 50 },
                { fuel: 'solar', perc: 10 },
                { fuel: 'hydro', perc: 5 },
                { fuel: 'gas', perc: 30 },
                { fuel: 'coal', perc: 5 }
            ]),
            createMockData('2023-01-02T12:00:00Z', 200, [
                { fuel: 'wind', perc: 20 },
                { fuel: 'solar', perc: 5 },
                { fuel: 'hydro', perc: 5 },
                { fuel: 'gas', perc: 60 },
                { fuel: 'coal', perc: 10 }
            ])
        ];

        const result = processYearData(data, 2023);

        expect(result.year).toBe(2023);
        expect(result.totalDataPoints).toBe(2);
        expect(result.avgIntensity).toBe(150); // (100 + 200) / 2
        expect(result.avgRenewableShare).toBe(48); // ((50+10+5) + (20+5+5)) / 2 = (65 + 30) / 2 = 47.5 -> 48
    });

    it('should identify peak renewable days', () => {
        const data: ForecastData[] = [
            createMockData('2023-01-01T10:00:00Z', 100, [{ fuel: 'wind', perc: 80 }, { fuel: 'solar', perc: 0 }]),
            createMockData('2023-06-01T12:00:00Z', 100, [{ fuel: 'wind', perc: 10 }, { fuel: 'solar', perc: 60 }]),
        ];

        const result = processYearData(data, 2023);

        expect(result.peakWind?.percentage).toBe(80);
        expect(result.peakWind?.date).toBe('2023-01-01');
        expect(result.peakSolar?.percentage).toBe(60);
        expect(result.peakSolar?.date).toBe('2023-06-01');
    });

    it('should calculate streaks correctly', () => {
        // 3 days of coal-free, then 1 day with coal
        // Since the function processes 48 periods per day, we need to simulate enough periods
        // But the function converts half-hours to days by dividing by 48.
        // So we need 48 periods of coal-free to get 1 day.

        const coalFreePeriod = createMockData('2023-01-01T00:00:00Z', 100, [{ fuel: 'coal', perc: 0 }]);
        const coalPeriod = createMockData('2023-01-02T00:00:00Z', 100, [{ fuel: 'coal', perc: 10 }]);

        const data: ForecastData[] = [];

        // 50 periods of coal free (just over 1 day)
        for (let i = 0; i < 50; i++) {
            data.push(coalFreePeriod);
        }
        // 1 period of coal
        data.push(coalPeriod);

        const result = processYearData(data, 2023);

        expect(result.longestCoalFree?.days).toBe(1); // floor(50 / 48) = 1
        expect(result.coalFreeDays).toBeGreaterThan(0);
    });

    it('should track monthly stats', () => {
        const data: ForecastData[] = [
            createMockData('2023-01-15T12:00:00Z', 300, []),
            createMockData('2023-01-16T12:00:00Z', 100, []),
            createMockData('2023-06-15T12:00:00Z', 50, []),
            createMockData('2023-06-16T12:00:00Z', 10, [])
        ];

        const result = processYearData(data, 2023);

        const january = result.monthlyBreakdown.find(m => m.month === 'January');
        const june = result.monthlyBreakdown.find(m => m.month === 'June');

        expect(january).toBeDefined();
        expect(january?.avgIntensity).toBe(200);

        expect(june).toBeDefined();
        expect(june?.avgIntensity).toBe(30);

        expect(result.bestMonth).toBe('June');
        expect(result.worstMonth).toBe('January');
    });
});
