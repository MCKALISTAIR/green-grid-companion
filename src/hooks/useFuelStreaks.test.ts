import { describe, it, expect } from 'vitest';
import { formatStreakDuration, getRecordMessage } from './useFuelStreaks';

describe('useFuelStreaks', () => {
  describe('formatStreakDuration', () => {
    it('returns empty string for 0 days', () => {
      expect(formatStreakDuration(0, 0)).toBe('');
      expect(formatStreakDuration(0, 5)).toBe(''); // Hours shouldn't matter
    });

    it('returns "1 day" for 1 day', () => {
      expect(formatStreakDuration(1, 0)).toBe('1 day');
      expect(formatStreakDuration(1, 12)).toBe('1 day');
    });

    it('returns "[n] days" for > 1 days', () => {
      expect(formatStreakDuration(2, 0)).toBe('2 days');
      expect(formatStreakDuration(10, 5)).toBe('10 days');
    });

    it('returns "[n]+ days" when exceededLookback is true', () => {
      expect(formatStreakDuration(30, 0, true)).toBe('30+ days');
      expect(formatStreakDuration(50, 0, true)).toBe('50+ days');
      // Edge case: even if days is small, if flag is true it appends +, though logic suggests days should be >= 30
      expect(formatStreakDuration(1, 0, true)).toBe('1+ days');
    });
  });

  describe('getRecordMessage', () => {
    it('returns first milestone message when previous record is 0', () => {
      expect(getRecordMessage('coal', 5, 0)).toBe('🎉 First Coal-free milestone recorded!');
    });

    it('returns correct message for 1 day improvement', () => {
      expect(getRecordMessage('coal', 11, 10)).toBe(
        '🏆 New record! 11 days without Coal - beating the previous record by 1 day!',
      );
    });

    it('returns correct message for > 1 day improvement', () => {
      expect(getRecordMessage('gas', 15, 10)).toBe(
        '🏆 New record! 15 days without Gas - 5 days longer than before!',
      );
    });

    it('capitalizes fuel name correctly', () => {
      expect(getRecordMessage('coal', 5, 0)).toContain('Coal');
      expect(getRecordMessage('gas', 5, 0)).toContain('Gas');
    });
  });
});
