import { describe, expect, it } from 'vitest';
import {
  COASTAL_POSTCODE_AREAS,
  INLAND_POSTCODE_AREAS,
  detectCityVariant,
  detectSceneFromPostcode,
  GREATER_LONDON_OUTER_DISTRICTS,
  isGreaterLondon,
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
    ['EN6', 'Potters Bar (EN, not E, and outside Greater London)'],
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

// Alistair, 23 Oct 2026: all of London gets London's landmarks, including
// Greater London (BR, CR, HA...), not just the London postal area. The outer
// areas also cover places outside London, so the mapping is by district.
describe('Greater London (by district)', () => {
  const INSIDE = [
    'BR1',
    'CR0',
    'HA1',
    'KT1',
    'TW1',
    'UB1',
    'EN1',
    'IG1',
    'RM1',
    'SM1',
    'DA5',
    'E1',
  ];
  const OUTSIDE = [
    ['WD17', 'Watford'],
    ['DA1', 'Dartford'],
    ['KT17', 'Epsom'],
    ['TW20', 'Egham'],
    ['EN6', 'Potters Bar'],
    ['RM16', 'Grays'],
    ['CM1', 'Chelmsford'],
  ] as const;

  it.each(INSIDE)('%s is Greater London: london variant and city scene', (pc) => {
    expect(isGreaterLondon(pc)).toBe(true);
    expect(detectCityVariant(pc)).toBe('london');
    expect(detectSceneFromPostcode(pc)).toBe('city');
  });

  it.each(OUTSIDE)('%s (%s) is outside Greater London: not london', (pc) => {
    expect(isGreaterLondon(pc)).toBe(false);
    expect(detectCityVariant(pc)).toBe('generic');
    expect(detectSceneFromPostcode(pc)).not.toBe('city');
  });

  it.each([
    ['CR0 1AA', true],
    ['cr01aa', true], // CR0 1AA without the space, not CR01
    ['ha1', true],
    ['kt171aa', false], // KT17 1AA
    ['KT1 7AA', true],
    ['DA1 5AA', false],
    ['DA5 1AA', true],
  ] as const)('full postcodes and lowercase: %s → %s', (pc, inside) => {
    expect(isGreaterLondon(pc)).toBe(inside);
    expect(detectCityVariant(pc)).toBe(inside ? 'london' : 'generic');
  });

  it.each([
    ['TN16', 'Biggin Hill vs Westerham, 48.6% London'],
    ['UB9', 'Harefield vs Denham, 47.6% London'],
    ['IG7', 'Chigwell, 36.9% London'],
  ])('minority-London straddlers follow the majority and stay out: %s (%s)', (pc) => {
    expect(isGreaterLondon(pc)).toBe(false);
    expect(detectCityVariant(pc)).toBe('generic');
  });

  it.each(['HA6', 'KT4', 'CR5', 'KT6', 'RM14'])('majority-London straddlers are in: %s', (pc) => {
    expect(isGreaterLondon(pc)).toBe(true);
  });

  it('matches district, not just area: the outer-area letters alone are not London', () => {
    for (const area of ['BR', 'CR', 'DA', 'EN', 'HA', 'IG', 'KT', 'RM', 'SM', 'TW', 'UB', 'WD']) {
      expect(isGreaterLondon(area)).toBe(false);
      expect(detectCityVariant(area)).toBe('generic');
    }
  });

  it('no WD district is in Greater London', () => {
    for (const d of GREATER_LONDON_OUTER_DISTRICTS) expect(d.startsWith('WD')).toBe(false);
  });

  it('every listed district is a well-formed outer-area district', () => {
    for (const d of GREATER_LONDON_OUTER_DISTRICTS) {
      expect(d).toMatch(/^(BR|CR|DA|EN|HA|IG|KT|RM|SM|TW|UB)\d{1,2}$/);
    }
  });

  it('inner London is unchanged', () => {
    for (const pc of ['EC1A', 'WC2N', 'E1', 'E14', 'N1', 'NW1', 'SE1', 'SW1A', 'W1A']) {
      expect(detectCityVariant(pc)).toBe('london');
      expect(detectSceneFromPostcode(pc)).toBe('city');
    }
  });

  it('GPS-only users (no postcode stored) get the generic variant, never London', () => {
    // LocationContext stores '' when the user relies on device location only.
    expect(isGreaterLondon('')).toBe(false);
    expect(detectCityVariant('')).toBe('generic');
    expect(detectCityVariant(null)).toBe('generic');
    expect(detectCityVariant(undefined)).toBe('generic');
  });
});
