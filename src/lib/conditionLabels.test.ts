import { describe, expect, it } from 'vitest';
import { CHEEKY_LINES, getConditionLabel, getConditionParts } from './conditionLabels';

const DAY = new Date('2026-10-11T10:00:00Z');

describe('getConditionLabel', () => {
  it('returns official band names in Plain', () => {
    expect(getConditionLabel('very low', 'plain')).toBe('Very low');
    expect(getConditionLabel('LOW', 'plain')).toBe('Low');
    expect(getConditionLabel('Very High', 'plain')).toBe('Very high');
  });

  it('leads with the official band name in Cheeky, then one line', () => {
    const label = getConditionLabel('very high', 'cheeky', 'test', DAY);
    expect(label.startsWith('Very high. ')).toBe(true);
    expect(CHEEKY_LINES['very high'].map((l) => `Very high. ${l}`)).toContain(label);
  });

  it('is stable for the same band, salt and day', () => {
    const a = getConditionLabel('low', 'cheeky', 'london', DAY);
    const b = getConditionLabel('low', 'cheeky', 'london', new Date('2026-10-11T22:00:00Z'));
    expect(a).toBe(b);
  });

  it('migrates legacy tone values', () => {
    expect(getConditionLabel('low', 'friendly', 'x', DAY)).toMatch(/^Low\. /);
    expect(getConditionLabel('low', 'snarky', 'x', DAY)).toMatch(/^Low\. /);
    expect(getConditionLabel('low', 'mixed', 'x', DAY)).toMatch(/^Low\. /);
  });

  it('falls back to the raw index when unknown', () => {
    expect(getConditionLabel('mystery', 'plain')).toBe('mystery');
    expect(getConditionLabel('mystery', 'cheeky')).toBe('mystery');
  });

  it('returns band and quip separately', () => {
    expect(getConditionParts('moderate', 'plain')).toEqual({ band: 'Moderate', quip: null });
    const parts = getConditionParts('moderate', 'cheeky', '', DAY);
    expect(parts.band).toBe('Moderate');
    expect(CHEEKY_LINES.moderate).toContain(parts.quip);
  });
});

describe('Cheeky band lines', () => {
  const all = Object.values(CHEEKY_LINES).flat();
  it('never mention coal, air quality or numbers, and use no em dashes', () => {
    for (const line of all) {
      expect(line).not.toMatch(/coal|air|pollut|\d|—/i);
    }
  });
  it('stay short enough for one hero line with the band name', () => {
    for (const line of all) expect(line.length).toBeLessThanOrEqual(31);
  });
});
