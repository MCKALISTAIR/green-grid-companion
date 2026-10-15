import { describe, it, expect } from 'vitest';
import { regionNameForPostcode, UK_REGIONS } from '@/lib/carbonApi';

// Every GB postcode area (Royal Mail list, excluding BT/Crown dependencies).
const GB_AREAS =
  `AB AL B BA BB BD BH BL BN BR BS CA CB CF CH CM CO CR CT CV CW DA DD DE DG DH DL DN DT DY
E EC EH EN EX FK FY G GL GU HA HD HG HP HR HS HU HX IG IP IV KA KT KW KY L LA LD LE LL LN LS LU
M ME MK ML N NE NG NN NP NR NW OL OX PA PE PH PL PO PR RG RH RM S SA SE SG SK SL SM SN SO SP SR
SS ST SW SY TA TD TF TN TQ TR TS TW UB W WA WC WD WF WN WR WS WV YO ZE`.split(/\s+/);

const TABLE = new Map(UK_REGIONS.map((r) => [r.postcode, r.name]));

describe('regionNameForPostcode', () => {
  it.each([
    'EX4',
    'GL1',
    'WR1',
    'BA1',
    'ME1',
    'ME',
    'NP20',
    'NP',
    'EN1',
    'WA1',
    'BB1',
    'MK9',
    'NN1',
  ])('%s is never guessed from its first letter (defers to the API)', (pc) => {
    expect(regionNameForPostcode(pc)).toBeUndefined();
  });

  it.each([
    ['SW1A', 'London'],
    ['SW1A 1AA', 'London'],
    ['E1', 'London'],
    ['M1', 'North West England'],
    ['G1', 'South Scotland'],
    ['B1', 'West Midlands'],
    ['NE1', 'North East England'],
    ['EH1', 'South Scotland'],
    ['CF10', 'South Wales'],
  ])('%s matches its exact area → %s', (pc, name) => {
    expect(regionNameForPostcode(pc)).toBe(name);
  });

  it.each(['GB', 'Scotland', 'England', 'Wales'])('region value %s resolves by name', (v) => {
    expect(regionNameForPostcode(v)).toBe(TABLE.get(v));
  });

  it('returns undefined for empty or junk input', () => {
    expect(regionNameForPostcode('')).toBeUndefined();
    expect(regionNameForPostcode(null)).toBeUndefined();
    expect(regionNameForPostcode('12345')).toBeUndefined();
  });

  describe.each(GB_AREAS)('GB area %s', (area) => {
    it('resolves only via an exact area entry, otherwise defers to the API', () => {
      const expected = TABLE.get(area); // undefined unless the area itself is in the table
      expect(regionNameForPostcode(area)).toBe(expected);
      expect(regionNameForPostcode(`${area}1`)).toBe(expected);
      expect(regionNameForPostcode(`${area}1 1AA`)).toBe(expected);
    });
  });
});
