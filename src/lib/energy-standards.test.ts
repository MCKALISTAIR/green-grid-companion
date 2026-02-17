import { describe, it, expect } from 'vitest';
import { getAverageDailyKwh, DEFAULT_HOUSE_TYPE, OFGEM_TDCV_2025 } from './energy-standards';

describe('getAverageDailyKwh', () => {
    it('returns the default house type average when no arguments are provided', () => {
        const expected = Number((OFGEM_TDCV_2025[DEFAULT_HOUSE_TYPE].annualKwh / 365).toFixed(2));
        expect(getAverageDailyKwh()).toBe(expected);
    });

    it('returns the correct average for LOW house type', () => {
        const expected = Number((OFGEM_TDCV_2025.LOW.annualKwh / 365).toFixed(2));
        expect(getAverageDailyKwh('LOW')).toBe(expected);
    });

    it('returns the correct average for MEDIUM house type', () => {
        const expected = Number((OFGEM_TDCV_2025.MEDIUM.annualKwh / 365).toFixed(2));
        expect(getAverageDailyKwh('MEDIUM')).toBe(expected);
    });

    it('returns the correct average for HIGH house type', () => {
        const expected = Number((OFGEM_TDCV_2025.HIGH.annualKwh / 365).toFixed(2));
        expect(getAverageDailyKwh('HIGH')).toBe(expected);
    });

    it('returns the correct average for CUSTOM house type with a valid value', () => {
        const customValue = 3650;
        const expected = 10.00;
        expect(getAverageDailyKwh('CUSTOM', customValue)).toBe(expected);
    });

    it('returns 0 for CUSTOM house type with no value provided', () => {
        expect(getAverageDailyKwh('CUSTOM')).toBe(0);
    });

    it('returns 0 for CUSTOM house type with 0 value', () => {
        expect(getAverageDailyKwh('CUSTOM', 0)).toBe(0);
    });

    it('handles decimal values for CUSTOM house type correctly', () => {
        const customValue = 1825.5;
        // 1825.5 / 365 = 5.001369... -> 5.00
        const expected = Number((customValue / 365).toFixed(2));
        expect(getAverageDailyKwh('CUSTOM', customValue)).toBe(expected);
    });
});
