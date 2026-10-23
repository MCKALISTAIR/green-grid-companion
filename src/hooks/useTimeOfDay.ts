import { useState, useEffect, useMemo } from 'react';
import { getSunTimes, sunPositionFromSun, timeOfDayFromSun } from '@/lib/sunTimes';
import { getSceneLocation, subscribeSceneLocation } from '@/lib/sceneLocation';

export type TimeOfDay = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'dusk';

interface TimeOfDayState {
  timeOfDay: TimeOfDay;
  hour: number;
  sunPosition: number; // 0-1, where 0.5 is noon
  isNight: boolean;
  isDawn: boolean;
  isDusk: boolean;
}

export function useTimeOfDay(): TimeOfDayState {
  const [now, setNow] = useState(() => new Date());
  const [loc, setLoc] = useState(getSceneLocation);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // every minute
    const unsub = subscribeSceneLocation(() => setLoc(getSceneLocation()));
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  return useMemo(() => {
    // Real sunrise/sunset for the user's location (art pass v1 §9), not fixed clock bands.
    const sun = getSunTimes(now, loc.lat, loc.lon);
    const timeOfDay = timeOfDayFromSun(now, sun);
    return {
      timeOfDay,
      hour: londonHour(now),
      sunPosition: sunPositionFromSun(now, sun),
      isNight: timeOfDay === 'night' || timeOfDay === 'dusk',
      isDawn: timeOfDay === 'dawn',
      isDusk: timeOfDay === 'dusk' || timeOfDay === 'sunset',
    };
  }, [now, loc]);
}

function londonHour(d: Date): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: 'Europe/London',
  }).format(d);
  return Number(h);
}
