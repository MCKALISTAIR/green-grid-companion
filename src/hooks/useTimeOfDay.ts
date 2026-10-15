import { useState, useEffect, useMemo } from 'react';

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
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const interval = setInterval(() => {
      setHour(new Date().getHours());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    let timeOfDay: TimeOfDay;

    if (hour >= 0 && hour < 5) {
      timeOfDay = 'night';
    } else if (hour >= 5 && hour < 7) {
      timeOfDay = 'dawn';
    } else if (hour >= 7 && hour < 11) {
      timeOfDay = 'morning';
    } else if (hour >= 11 && hour < 14) {
      timeOfDay = 'midday';
    } else if (hour >= 14 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 20) {
      timeOfDay = 'sunset';
    } else if (hour >= 20 && hour < 22) {
      timeOfDay = 'dusk';
    } else {
      timeOfDay = 'night';
    }

    // Sun position: 0 at 6am, 0.5 at noon, 1 at 6pm
    const sunPosition = Math.max(0, Math.min(1, (hour - 6) / 12));

    return {
      timeOfDay,
      hour,
      sunPosition,
      isNight: timeOfDay === 'night' || timeOfDay === 'dusk',
      isDawn: timeOfDay === 'dawn',
      isDusk: timeOfDay === 'dusk' || timeOfDay === 'sunset',
    };
  }, [hour]);
}
