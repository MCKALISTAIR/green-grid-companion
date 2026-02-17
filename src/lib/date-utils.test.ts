import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getDayLabel, getUKOffset } from './date-utils';

describe('date-utils', () => {
    describe('getUKOffset', () => {
        // Standard non-boundary cases
        it('returns 0 for a date in Winter (January)', () => {
            const date = new Date('2024-01-15T12:00:00Z');
            expect(getUKOffset(date)).toBe(0);
        });

        it('returns 1 for a date in Summer (July)', () => {
            const date = new Date('2024-07-15T12:00:00Z');
            expect(getUKOffset(date)).toBe(1);
        });

        // 2024 Boundary Checks
        // In 2024, March 31 is Sunday.
        // BST starts on the last Sunday of March (March 31) at 01:00 UTC.
        it('returns 0 just before BST starts in 2024', () => {
            const date = new Date('2024-03-31T00:59:59Z');
            expect(getUKOffset(date)).toBe(0);
        });

        it('returns 1 exactly when BST starts in 2024', () => {
            const date = new Date('2024-03-31T01:00:00Z');
            expect(getUKOffset(date)).toBe(1);
        });

        // In 2024, October 27 is the last Sunday.
        // BST ends on the last Sunday of October (Oct 27) at 01:00 UTC.
        it('returns 1 just before BST ends in 2024', () => {
            const date = new Date('2024-10-27T00:59:59Z');
            expect(getUKOffset(date)).toBe(1);
        });

        it('returns 0 exactly when BST ends in 2024', () => {
            const date = new Date('2024-10-27T01:00:00Z');
            expect(getUKOffset(date)).toBe(0);
        });

        // 2023 Boundary Checks
        // In 2023, March 31 was Friday. Last Sunday was March 26.
        // BST starts March 26, 2023 at 01:00 UTC.
        it('returns 1 when BST starts in 2023 (early March Sunday)', () => {
            const date = new Date('2023-03-26T01:00:00Z');
            expect(getUKOffset(date)).toBe(1);
        });

        // In 2023, October 31 was Tuesday. Last Sunday was October 29.
        // BST ends Oct 29, 2023 at 01:00 UTC.
        it('returns 0 when BST ends in 2023 (late October Sunday)', () => {
            const date = new Date('2023-10-29T01:00:00Z');
            expect(getUKOffset(date)).toBe(0);
        });
    });

    describe('getDayLabel', () => {
        beforeEach(() => {
            // Mock system time to a fixed date: Monday, Jan 1, 2024 12:00 UTC
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns empty string for today', () => {
            const today = new Date('2024-01-01T15:00:00Z');
            expect(getDayLabel(today)).toBe('');
        });

        it('returns "tomorrow" for tomorrow', () => {
            const tomorrow = new Date('2024-01-02T10:00:00Z');
            expect(getDayLabel(tomorrow)).toBe('tomorrow');
        });

        it('returns day name for other days', () => {
            const wednesday = new Date('2024-01-03T10:00:00Z');
            expect(getDayLabel(wednesday)).toBe('Wednesday');
        });
    });
});
