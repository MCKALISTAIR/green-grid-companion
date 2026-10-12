import { describe, it, expect } from 'vitest';
import {
  roundCoord,
  roundCoords,
  coordParams,
  postcodesIoReverseUrl,
  nominatimReverseUrl,
} from './coords';

describe('coords', () => {
  it('rounds to 2 decimal places and normalises -0', () => {
    expect(roundCoord(51.507351)).toBe(51.51);
    expect(roundCoord(-0.127758)).toBe(-0.13);
    expect(roundCoord(-0.001)).toBe(0);
    expect(roundCoord(Number.NaN)).toBeNaN();
  });

  it('builds rounded query params and reverse-lookup URLs', () => {
    expect(coordParams(51.507351, -0.127758)).toEqual({ lat: '51.51', lon: '-0.13' });
    expect(roundCoords({ lat: 51.507351, lon: -0.127758, extra: true })).toEqual({
      lat: 51.51,
      lon: -0.13,
    });
    expect(postcodesIoReverseUrl(51.507351, -0.127758)).toBe(
      'https://api.postcodes.io/postcodes?lon=-0.13&lat=51.51&radius=2000&limit=1',
    );
    expect(nominatimReverseUrl(51.507351, -0.127758)).toContain('lat=51.51');
    expect(nominatimReverseUrl(51.507351, -0.127758)).toContain('lon=-0.13');
  });
});
