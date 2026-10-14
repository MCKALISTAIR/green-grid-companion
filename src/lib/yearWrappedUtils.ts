import { format } from 'date-fns';
import { ForecastData } from '@/lib/carbonApi';

export interface FuelFreePeriod {
  fuel: string;
  startDate: string;
  endDate: string;
  days: number;
}

export interface RenewableHigh {
  fuel: string;
  percentage: number;
  date: string;
  time: string;
}

export interface MonthlyIntensity {
  month: string;
  avgIntensity: number;
  minIntensity: number;
  maxIntensity: number;
}

export interface YearWrappedData {
  year: number;
  totalDataPoints: number;

  // Fuel-free streaks
  longestCoalFree: FuelFreePeriod | null;
  longestGasFree: FuelFreePeriod | null;
  coalFreeDays: number;
  gasFreeDays: number;

  // Renewable highs
  peakWind: RenewableHigh | null;
  peakSolar: RenewableHigh | null;
  avgRenewableShare: number;

  // Carbon intensity
  avgIntensity: number;
  lowestIntensity: { value: number; date: string; time: string } | null;
  highestIntensity: { value: number; date: string; time: string } | null;
  monthlyBreakdown: MonthlyIntensity[];
  bestMonth: string | null;
  worstMonth: string | null;

  // Fun facts
  greenestDay: { date: string; renewableShare: number } | null;
  dirtestDay: { date: string; fossilShare: number } | null;
}

export function processYearData(data: ForecastData[], year: number): YearWrappedData {
  // Initialize tracking variables
  let coalFreeDays = 0;
  let gasFreeDays = 0;
  let totalIntensity = 0;
  let intensityCount = 0;
  let totalRenewable = 0;
  let renewableCount = 0;

  let lowestIntensity: { value: number; date: string; time: string } | null = null;
  let highestIntensity: { value: number; date: string; time: string } | null = null;
  let peakWind: RenewableHigh | null = null;
  let peakSolar: RenewableHigh | null = null;
  let greenestDay: { date: string; renewableShare: number } | null = null;
  let dirtestDay: { date: string; fossilShare: number } | null = null;

  // Track daily aggregates for day-level stats
  const dailyData: Map<
    string,
    {
      renewableSum: number;
      fossilSum: number;
      count: number;
      coalFree: boolean;
      gasFree: boolean;
    }
  > = new Map();

  // Track monthly data
  const monthlyData: Map<
    string,
    { intensitySum: number; count: number; min: number; max: number }
  > = new Map();

  // Track longest fuel-free streaks
  let currentCoalStreak = 0;
  let longestCoalStreak = 0;
  let coalStreakStart: string | null = null;
  let longestCoalStart: string | null = null;
  let longestCoalEnd: string | null = null;

  let currentGasStreak = 0;
  let longestGasStreak = 0;
  let gasStreakStart: string | null = null;
  let longestGasStart: string | null = null;
  let longestGasEnd: string | null = null;

  // Process each data point
  for (const point of data) {
    const dateTime = new Date(point.from);
    const dateStr = format(dateTime, 'yyyy-MM-dd');
    const timeStr = format(dateTime, 'HH:mm');
    const monthStr = format(dateTime, 'MMMM');

    const intensity = point.intensity.actual ?? point.intensity.forecast;
    const mix = point.generationmix || [];

    // Intensity tracking
    if (intensity > 0) {
      totalIntensity += intensity;
      intensityCount++;

      if (!lowestIntensity || intensity < lowestIntensity.value) {
        lowestIntensity = { value: intensity, date: dateStr, time: timeStr };
      }
      if (!highestIntensity || intensity > highestIntensity.value) {
        highestIntensity = { value: intensity, date: dateStr, time: timeStr };
      }

      // Monthly tracking
      const existing = monthlyData.get(monthStr) || {
        intensitySum: 0,
        count: 0,
        min: Infinity,
        max: 0,
      };
      monthlyData.set(monthStr, {
        intensitySum: existing.intensitySum + intensity,
        count: existing.count + 1,
        min: Math.min(existing.min, intensity),
        max: Math.max(existing.max, intensity),
      });
    }

    // Generation mix tracking
    if (mix.length > 0) {
      const coalPerc = mix.find((m) => m.fuel === 'coal')?.perc || 0;
      const gasPerc = mix.find((m) => m.fuel === 'gas')?.perc || 0;
      const windPerc = mix.find((m) => m.fuel === 'wind')?.perc || 0;
      const solarPerc = mix.find((m) => m.fuel === 'solar')?.perc || 0;
      const hydroPerc = mix.find((m) => m.fuel === 'hydro')?.perc || 0;

      const renewableShare = windPerc + solarPerc + hydroPerc;
      const fossilShare = coalPerc + gasPerc;

      totalRenewable += renewableShare;
      renewableCount++;

      // Peak tracking
      if (!peakWind || windPerc > peakWind.percentage) {
        peakWind = { fuel: 'wind', percentage: windPerc, date: dateStr, time: timeStr };
      }
      if (!peakSolar || solarPerc > peakSolar.percentage) {
        peakSolar = { fuel: 'solar', percentage: solarPerc, date: dateStr, time: timeStr };
      }

      // Daily aggregates
      const dayData = dailyData.get(dateStr) || {
        renewableSum: 0,
        fossilSum: 0,
        count: 0,
        coalFree: true,
        gasFree: true,
      };
      dayData.renewableSum += renewableShare;
      dayData.fossilSum += fossilShare;
      dayData.count++;
      if (coalPerc > 0) dayData.coalFree = false;
      if (gasPerc > 0) dayData.gasFree = false;
      dailyData.set(dateStr, dayData);

      // Coal streak tracking
      if (coalPerc === 0) {
        if (currentCoalStreak === 0) coalStreakStart = dateStr;
        currentCoalStreak++;
      } else {
        if (currentCoalStreak > longestCoalStreak) {
          longestCoalStreak = currentCoalStreak;
          longestCoalStart = coalStreakStart;
          longestCoalEnd = dateStr;
        }
        currentCoalStreak = 0;
        coalStreakStart = null;
      }

      // Gas streak tracking (less likely to be 0, but track anyway)
      if (gasPerc === 0) {
        if (currentGasStreak === 0) gasStreakStart = dateStr;
        currentGasStreak++;
      } else {
        if (currentGasStreak > longestGasStreak) {
          longestGasStreak = currentGasStreak;
          longestGasStart = gasStreakStart;
          longestGasEnd = dateStr;
        }
        currentGasStreak = 0;
        gasStreakStart = null;
      }
    }
  }

  // Finalize ongoing streaks
  if (currentCoalStreak > longestCoalStreak) {
    longestCoalStreak = currentCoalStreak;
    longestCoalStart = coalStreakStart;
    longestCoalEnd = format(new Date(), 'yyyy-MM-dd');
  }
  if (currentGasStreak > longestGasStreak) {
    longestGasStreak = currentGasStreak;
    longestGasStart = gasStreakStart;
    longestGasEnd = format(new Date(), 'yyyy-MM-dd');
  }

  // Find greenest and dirtiest days
  dailyData.forEach((dayData, dateStr) => {
    const avgRenewable = dayData.renewableSum / dayData.count;
    const avgFossil = dayData.fossilSum / dayData.count;

    if (!greenestDay || avgRenewable > greenestDay.renewableShare) {
      greenestDay = { date: dateStr, renewableShare: avgRenewable };
    }
    if (!dirtestDay || avgFossil > dirtestDay.fossilShare) {
      dirtestDay = { date: dateStr, fossilShare: avgFossil };
    }

    if (dayData.coalFree) coalFreeDays++;
    if (dayData.gasFree) gasFreeDays++;
  });

  // Process monthly breakdown
  const monthlyBreakdown: MonthlyIntensity[] = [];
  let bestMonth: string | null = null;
  let worstMonth: string | null = null;
  let bestMonthAvg = Infinity;
  let worstMonthAvg = 0;

  monthlyData.forEach((mData, month) => {
    const avg = mData.intensitySum / mData.count;
    monthlyBreakdown.push({
      month,
      avgIntensity: Math.round(avg),
      minIntensity: mData.min === Infinity ? 0 : mData.min,
      maxIntensity: mData.max,
    });

    if (avg < bestMonthAvg) {
      bestMonthAvg = avg;
      bestMonth = month;
    }
    if (avg > worstMonthAvg) {
      worstMonthAvg = avg;
      worstMonth = month;
    }
  });

  // Convert coal streak from half-hour periods to days (48 periods per day)
  const coalStreakDays = Math.floor(longestCoalStreak / 48);
  const gasStreakDays = Math.floor(longestGasStreak / 48);

  return {
    year,
    totalDataPoints: data.length,

    longestCoalFree:
      longestCoalStart && coalStreakDays > 0
        ? {
            fuel: 'coal',
            startDate: longestCoalStart,
            endDate: longestCoalEnd || longestCoalStart,
            days: coalStreakDays,
          }
        : null,

    longestGasFree:
      longestGasStart && gasStreakDays > 0
        ? {
            fuel: 'gas',
            startDate: longestGasStart,
            endDate: longestGasEnd || longestGasStart,
            days: gasStreakDays,
          }
        : null,

    coalFreeDays,
    gasFreeDays,

    peakWind,
    peakSolar,
    avgRenewableShare: renewableCount > 0 ? Math.round(totalRenewable / renewableCount) : 0,

    avgIntensity: intensityCount > 0 ? Math.round(totalIntensity / intensityCount) : 0,
    lowestIntensity,
    highestIntensity,
    monthlyBreakdown,
    bestMonth,
    worstMonth,

    greenestDay,
    dirtestDay,
  };
}
