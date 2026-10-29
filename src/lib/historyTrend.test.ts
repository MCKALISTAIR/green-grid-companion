import { describe, it, expect } from 'vitest';
import { classifyHistoryTrend, historyTrendCopy } from './historyTrend';

describe('classifyHistoryTrend', () => {
  it('treats no change as flat (audit case: avg 1 g, trend 0)', () => {
    expect(classifyHistoryTrend(1, 1)).toBe('flat');
    expect(classifyHistoryTrend(0, 0)).toBe('flat');
  });
  it('treats a 1 g step as flat at low intensity', () => {
    expect(classifyHistoryTrend(13, 12)).toBe('flat');
    expect(classifyHistoryTrend(13, 14)).toBe('flat');
  });
  it('uses 2% at higher intensity', () => {
    expect(classifyHistoryTrend(250, 245)).toBe('flat');
    expect(classifyHistoryTrend(250, 255)).toBe('flat');
    expect(classifyHistoryTrend(250, 244)).toBe('improving');
    expect(classifyHistoryTrend(250, 256)).toBe('worsening');
  });
  it('keeps clear moves directional', () => {
    expect(classifyHistoryTrend(13, 10)).toBe('improving');
    expect(classifyHistoryTrend(40, 0)).toBe('improving');
    expect(classifyHistoryTrend(0, 40)).toBe('worsening');
  });
});

describe('historyTrendCopy', () => {
  it('gives neutral copy for flat', () => {
    expect(historyTrendCopy('flat', '7d')).toBe('About the same as the start of the week');
    expect(historyTrendCopy('flat', '24h')).toBe('About the same as the start of the day');
  });
  it('keeps existing directional copy', () => {
    expect(historyTrendCopy('improving', '7d')).toBe('Lower than at the start');
    expect(historyTrendCopy('worsening', '24h')).toBe('Higher than at the start');
  });
});
