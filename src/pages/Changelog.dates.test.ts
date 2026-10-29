import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// BH-132: two entries used new Date() and showed "today" as their release date.
const src = readFileSync(resolve(__dirname, 'Changelog.tsx'), 'utf8');

describe('Changelog dates (BH-132)', () => {
  it('every entry has a fixed YYYY-MM-DD date', () => {
    expect(src).not.toMatch(/date:\s*new Date/);
    const dates = [...src.matchAll(/^\s{4}date: '([^']+)'/gm)].map((m) => m[1]);
    expect(dates.length).toBeGreaterThan(5);
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('entries are listed newest first', () => {
    const dates = [...src.matchAll(/^\s{4}date: '([^']+)'/gm)].map((m) => m[1]);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });
});
