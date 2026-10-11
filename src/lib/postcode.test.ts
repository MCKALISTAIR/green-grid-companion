import { describe, expect, it } from 'vitest';
import { isNorthernIrelandPostcode, isValidPostcode, toOutwardCode } from './postcode';

describe('toOutwardCode', () => {
  it.each([
    ['SW1A 1AA', 'SW1A'],
    ['SW1A1AA', 'SW1A'],
    ['sw1a1aa', 'SW1A'],
    ['  EH1 1YZ ', 'EH1'],
    ['M11AE', 'M1'],
    ['CF10', 'CF10'],
    ['eh1', 'EH1'],
    ['GB', 'GB'],
    ['Scotland', 'Scotland'],
  ])('%s -> %s', (input, out) => expect(toOutwardCode(input)).toBe(out));
});

describe('isValidPostcode', () => {
  it('accepts full postcodes with or without a space, and outward codes', () => {
    for (const v of ['SW1A 1AA', 'SW1A1AA', 'SW1A', 'B1', 'EH1 1YZ']) expect(isValidPostcode(v)).toBe(true);
  });
  it('rejects junk', () => {
    for (const v of ['', 'hello', '12345', 'SW1A 1A']) expect(isValidPostcode(v)).toBe(false);
  });
});

describe('isNorthernIrelandPostcode', () => {
  it('spots BT postcodes only', () => {
    expect(isNorthernIrelandPostcode('BT1 1AA')).toBe(true);
    expect(isNorthernIrelandPostcode('bt7')).toBe(true);
    expect(isNorthernIrelandPostcode('B1')).toBe(false);
  });
});
