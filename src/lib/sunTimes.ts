/**
 * Sunrise / sunset on the device (NOAA solar position approximation, about ±2 min
 * for UK latitudes). No network call: uses the coordinates the app already has.
 * Times are absolute instants, so the scene follows the real sun in any device
 * timezone; labels elsewhere still format in Europe/London.
 */
import type { TimeOfDay } from '@/hooks/useTimeOfDay';

const RAD = Math.PI / 180;

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
}

export function getSunTimes(date: Date, lat: number, lon: number): SunTimes {
  // Day of year in UTC.
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  const g = ((2 * Math.PI) / 365) * (day - 1);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const noonMin = 720 - 4 * lon - eqTime;
  const solarNoon = new Date(midnight + noonMin * 60000);
  const cosHa =
    Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl)) -
    Math.tan(lat * RAD) * Math.tan(decl);
  if (cosHa > 1 || cosHa < -1) return { sunrise: null, sunset: null, solarNoon };
  const haMin = (Math.acos(cosHa) / RAD) * 4;
  return {
    sunrise: new Date(midnight + (noonMin - haMin) * 60000),
    sunset: new Date(midnight + (noonMin + haMin) * 60000),
    solarNoon,
  };
}

const MIN = 60000;

/**
 * Time-of-day band from the real sun:
 * dawn = sunrise ±45 min, morning until 1.5 h before solar noon, midday ±1.5 h of
 * noon, afternoon until 1.5 h before sunset, sunset until 20 min after it, dusk
 * until 75 min after sunset, then night. Short winter days fall through in order.
 */
export function timeOfDayFromSun(now: Date, sun: SunTimes): TimeOfDay {
  const t = now.getTime();
  const { sunrise, sunset, solarNoon } = sun;
  if (!sunrise || !sunset) {
    // Polar day/night: not reachable in the UK, but stay sensible.
    return Math.abs(t - solarNoon.getTime()) < 6 * 60 * MIN ? 'midday' : 'night';
  }
  const rise = sunrise.getTime();
  const set = sunset.getTime();
  const noon = solarNoon.getTime();
  if (t < rise - 45 * MIN) return 'night';
  if (t < rise + 45 * MIN) return 'dawn';
  if (t >= set + 75 * MIN) return 'night';
  if (t >= set + 20 * MIN) return 'dusk';
  if (t >= set - 90 * MIN) return 'sunset';
  if (t < noon - 90 * MIN) return 'morning';
  if (t <= noon + 90 * MIN) return 'midday';
  return 'afternoon';
}

/** 0 at sunrise, 0.5 at solar noon, 1 at sunset (clamped). */
export function sunPositionFromSun(now: Date, sun: SunTimes): number {
  if (!sun.sunrise || !sun.sunset) return 0.5;
  const p =
    (now.getTime() - sun.sunrise.getTime()) / (sun.sunset.getTime() - sun.sunrise.getTime());
  return Math.max(0, Math.min(1, p));
}
