import { describe, expect, it } from 'vitest';
import {
  COASTAL_POSTCODE_AREAS,
  INLAND_POSTCODE_AREAS,
  detectCityVariant,
  detectSceneFromPostcode,
  postcodeArea,
  postcodeDistrict,
} from './useSceneType';

// PR-B2 / BH-98 / BH-99. Alistair's decisions, 23 Oct 2026:
// London keeps its landmarks, Edinburgh gets its own variant, every other city
// is generic, and DN, SY, FK and PH never get the coastal scene.

describe('postcodeArea', () => {
  it.each([
    ['SW1A', 'SW'],
    ['sw1a', 'SW'],
    ['SW1A 1AA', 'SW'],
    ['sw1a1aa', 'SW'],
    [' E1 ', 'E'],
    ['EC1A', 'EC'],
    ['N1', 'N'],
    ['W1A', 'W'],
    ['EH1', 'EH'],
    ['M1', 'M'],
  ])('%s → %s', (input, area) => {
    expect(postcodeArea(input)).toBe(area);
  });

  it.each(['', '   ', 'GB', 'Scotland', 'England', 'Wales', 'SCOTLAND', '123', 'BFPO'])(
    'region names and junk have no area: %j',
    (input) => {
      expect(postcodeArea(input)).toBeNull();
    },
  );

  it('handles null and undefined', () => {
    expect(postcodeArea(null)).toBeNull();
    expect(postcodeArea(undefined)).toBeNull();
  });
});

describe('postcodeDistrict', () => {
  it.each([
    ['EH1', 1],
    ['EH17', 17],
    ['EH18', 18],
    ['EH46', 46],
    ['EH1 1YZ', 1],
    ['eh11yz', 1], // EH1 1YZ without the space, not EH11
    ['EH111AA', 11],
    ['EH171AA', 17],
    ['SW1A', 1],
    ['SW1A 1AA', 1],
  ])('%s → %d', (pc, district) => {
    expect(postcodeDistrict(pc)).toBe(district);
  });

  it.each(['', 'EH', 'GB', 'Scotland', null, undefined])('no district: %j', (pc) => {
    expect(postcodeDistrict(pc)).toBeNull();
  });
});

describe('detectCityVariant', () => {
  it.each(['EC1A', 'WC2N', 'E1', 'E14', 'N1', 'NW1', 'SE1', 'SW1A', 'W1A', 'SW1A 1AA'])(
    'London: %s → london',
    (pc) => {
      expect(detectCityVariant(pc)).toBe('london');
    },
  );

  // Design, 23 Oct 2026: Edinburgh is the city districts EH1 to EH17 only.
  it.each(['EH1', 'EH3', 'EH12', 'EH17', 'EH1 1YZ', 'EH17 8AA', 'eh1', 'eh11yz', 'eh171aa'])(
    'Edinburgh city district: %s → edinburgh',
    (pc) => {
      expect(detectCityVariant(pc)).toBe('edinburgh');
    },
  );

  it.each(['EH18', 'EH19', 'EH30', 'EH46', 'EH52', 'EH18 1AA', 'eh46', 'eh461aa'])(
    'Lothians and Peebles (EH18 and up) are generic: %s',
    (pc) => {
      expect(detectCityVariant(pc)).toBe('generic');
    },
  );

  it.each(['EH', 'eh', 'EH ', 'EHX'])('EH with no district is generic: %j', (pc) => {
    expect(detectCityVariant(pc)).toBe('generic');
  });

  it.each([
    ['M1', 'Manchester'],
    ['G1', 'Glasgow'],
    ['B1', 'Birmingham'],
    ['L1', 'Liverpool'],
    ['LS1', 'Leeds'],
    ['CF10', 'Cardiff'],
    ['BS1', 'Bristol'],
    ['NE1', 'Newcastle'],
    ['EN1', 'Enfield (EN, not E)'],
    ['WA1', 'Warrington (WA, not W)'],
    ['SN1', 'Swindon (SN, not S or N)'],
    ['DN1', 'Doncaster'],
  ])('other cities are generic: %s (%s)', (pc) => {
    expect(detectCityVariant(pc)).toBe('generic');
  });

  it('lowercase works the same as uppercase', () => {
    expect(detectCityVariant('sw1a')).toBe('london');
    expect(detectCityVariant('e1')).toBe('london');
    expect(detectCityVariant('m1')).toBe('generic');
  });

  it('missing postcode or region names are generic, never London', () => {
    for (const pc of ['', null, undefined, 'GB', 'England', 'Scotland', 'Wales']) {
      expect(detectCityVariant(pc)).toBe('generic');
    }
  });

  it('outcode only (what the app stores) is enough', () => {
    expect(detectCityVariant('SE1')).toBe('london');
    expect(detectCityVariant('EH8')).toBe('edinburgh');
    expect(detectCityVariant('EH18')).toBe('generic');
    expect(detectCityVariant('M4')).toBe('generic');
  });
});

describe('detectSceneFromPostcode', () => {
  it.each(['DN1', 'DN31', 'SY1', 'SY23', 'FK1', 'FK8', 'PH1', 'PH33', 'dn1', 'sy1 1aa'])(
    'inland %s never gets the coastal scene',
    (pc) => {
      const scene = detectSceneFromPostcode(pc);
      expect(scene).not.toBe('coastal');
      expect(scene).toBe('countryside');
    },
  );

  it('the inland areas are not in the coastal list at all', () => {
    for (const area of INLAND_POSTCODE_AREAS) {
      expect(COASTAL_POSTCODE_AREAS.has(area)).toBe(false);
    }
  });

  it.each([
    'PL1',
    'TR1',
    'EX1',
    'SA1',
    'TQ1',
    'DT1',
    'BH1',
    'CT1',
    'PA1',
    'KW1',
    'IV1',
    'KA1',
    'LL1',
    'AB10',
    'DD1',
    'HS1',
    'ZE1',
    'IM1',
    'JE1',
    'GY1',
  ])('real coastal areas stay coastal: %s', (pc) => {
    expect(detectSceneFromPostcode(pc)).toBe('coastal');
  });

  it.each(['SW1A', 'E1', 'EC1A', 'EH1', 'EH1 1YZ', 'M1', 'G1', 'LS1', 'CF10', 'eh1'])(
    'cities are city: %s',
    (pc) => {
      expect(detectSceneFromPostcode(pc)).toBe('city');
    },
  );

  it.each(['', null, undefined, 'GB', 'Scotland', 'England', 'Wales', 'TD1', 'DG1', 'HR1'])(
    'everything else is countryside: %j',
    (pc) => {
      expect(detectSceneFromPostcode(pc)).toBe('countryside');
    },
  );
});
