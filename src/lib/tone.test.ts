import { beforeEach, describe, expect, it } from 'vitest';
import { normaliseTone, readTone, TONE_STORAGE_KEY, writeTone } from './tone';

describe('commentary tone', () => {
  beforeEach(() => localStorage.clear());

  it('defaults new users to Cheeky', () => {
    expect(readTone()).toBe('cheeky');
    expect(localStorage.getItem(TONE_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ['friendly', 'cheeky'],
    ['snarky', 'cheeky'],
    ['mixed', 'cheeky'],
    ['plain', 'plain'],
    ['cheeky', 'cheeky'],
    ['garbage', 'cheeky'],
  ])('migrates %s to %s in place', (stored, expected) => {
    localStorage.setItem(TONE_STORAGE_KEY, stored);
    expect(readTone()).toBe(expected);
    expect(localStorage.getItem(TONE_STORAGE_KEY)).toBe(expected);
  });

  it('keeps the existing storage key', () => {
    writeTone('plain');
    expect(localStorage.getItem('gridgreen-fact-prefs')).toBe('plain');
  });

  it('normalises case and whitespace', () => {
    expect(normaliseTone(' Plain ')).toBe('plain');
  });
});
