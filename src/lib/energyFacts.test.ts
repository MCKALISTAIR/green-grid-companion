import { describe, expect, it } from 'vitest';
import { ENERGY_FACTS } from './energyFacts';

describe('rotating energy facts', () => {
  it('every line that states a number, date or record cites a source URL', () => {
    const unsourced = ENERGY_FACTS.filter((f) => /\d|record/i.test(f.text) && !f.source).map(
      (f) => `${f.id}: ${f.text}`,
    );
    expect(unsourced).toEqual([]);
  });

  it('sources are https URLs', () => {
    for (const f of ENERGY_FACTS.filter((x) => x.source)) {
      for (const url of f.source!.split(' ; ')) expect(url, f.id).toMatch(/^https:\/\/\S+$/);
    }
  });

  it('dropped unverified facts stay dropped', () => {
    const text = ENERGY_FACTS.map((f) => f.text).join('\n');
    expect(text).not.toMatch(/Netflix/);
    expect(text).not.toMatch(/67 days, 22 hours without/);
    expect(new Set(ENERGY_FACTS.map((f) => f.id)).size).toBe(ENERGY_FACTS.length);
  });

  it('keeps the exact 2020 coal-free record from NESO (then National Grid ESO)', () => {
    expect(ENERGY_FACTS.find((f) => f.id === 'general_friendly_5')?.text).toContain(
      '67 days, 22 hours and 55 minutes',
    );
  });

  it('never names an intensity band, so a fact cannot contradict the hero label (#196 round 3)', () => {
    // Facts are chosen by grams (> 200 g), not by the NESO band the label shows, so a
    // fact saying "high" could sit under a "Very high" label. Keep them band-free.
    const bandClaim = /\b(intensity|carbon) is (very )?(low|moderate|high)\b/i;
    expect(ENERGY_FACTS.filter((f) => bandClaim.test(f.text)).map((f) => f.id)).toEqual([]);
    expect(ENERGY_FACTS.find((f) => f.id === 'dirty_friendly_1')?.text).toBe(
      'The grid is running dirtier than usual right now. Try to save energy if you can.',
    );
  });
});
