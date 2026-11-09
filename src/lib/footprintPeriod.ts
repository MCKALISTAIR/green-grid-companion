import type { FootprintData, FootprintRecord } from '@/hooks/useOctopusEnergy';
import {
  londonDateKey,
  londonMidnight,
  nextDateKey,
  formatLondonSlotTime,
  formatLondonDayShortMonth,
} from './londonTime';

export type FootprintRange = 'day' | 'week' | 'month' | 'year';

export function footprintPeriod(data: FootprintData, range: FootprintRange, selected: Date) {
  const key = londonDateKey(selected);
  let fromKey = key;
  let endKey = nextDateKey(key);
  if (range === 'week') for (let i = 1; i < 7; i++) endKey = nextDateKey(endKey);
  if (range === 'month') {
    fromKey = `${key.slice(0, 7)}-01`;
    const [y, m] = key.split('-').map(Number);
    endKey = new Date(Date.UTC(y, m, 1, 12)).toISOString().slice(0, 10);
  }
  if (range === 'year') {
    fromKey = `${key.slice(0, 4)}-01-01`;
    endKey = `${Number(key.slice(0, 4)) + 1}-01-01`;
  }
  const start = londonMidnight(fromKey).getTime();
  const end = londonMidnight(endKey).getTime();
  const select = (rows: FootprintRecord[]) =>
    rows.filter((r) => {
      const t = Date.parse(r.interval_start);
      return t >= start && t < end;
    });
  const records = select(data.records);
  const exports = select(data.export_records ?? []);
  const byIndex: FootprintData['summary']['by_intensity_index'] = {};
  let kwh = 0,
    carbon = 0,
    intensity = 0;
  const days = new Set<string>();
  for (const r of records) {
    kwh += Number(r.consumption_kwh);
    carbon += Number(r.carbon_g);
    intensity += Number(r.intensity_gco2_kwh);
    days.add(londonDateKey(new Date(r.interval_start)));
    const bucket = byIndex[r.intensity_index] ?? { count: 0, carbon_g: 0, kwh: 0 };
    bucket.count++;
    bucket.carbon_g += Number(r.carbon_g);
    bucket.kwh += Number(r.consumption_kwh);
    byIndex[r.intensity_index] = bucket;
  }
  const exportCarbon = exports.reduce((sum, r) => sum + Number(r.carbon_g), 0) / 1000;
  return {
    records,
    coveredDays: days.size,
    summary: {
      total_kwh: kwh,
      total_carbon_kg: carbon / 1000,
      avg_intensity: records.length ? Math.round(intensity / records.length) : 0,
      by_intensity_index: byIndex,
      period_days: days.size,
      has_export_meter: data.summary.has_export_meter,
      export_kwh: exports.reduce((sum, r) => sum + Number(r.consumption_kwh), 0),
      export_carbon_kg: exportCarbon,
      net_carbon_kg: carbon / 1000 - exportCarbon,
    },
  };
}

export function footprintBuckets(records: FootprintRecord[], range: FootprintRange) {
  const buckets = new Map<string, { date: Date; carbon: number; kwh: number }>();
  for (const r of records) {
    const at = new Date(r.interval_start);
    const day = londonDateKey(at);
    const hour = new Date(Math.floor(at.getTime() / 3600_000) * 3600_000);
    const key = range === 'day' ? hour.toISOString() : range === 'year' ? day.slice(0, 7) : day;
    const date =
      range === 'day' ? hour : londonMidnight(range === 'year' ? `${day.slice(0, 7)}-01` : day);
    const b = buckets.get(key) ?? { date, carbon: 0, kwh: 0 };
    b.carbon += Number(r.carbon_g) / 1000;
    b.kwh += Number(r.consumption_kwh);
    buckets.set(key, b);
  }
  return [...buckets.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({
      date:
        range === 'day'
          ? formatLondonSlotTime(b.date)
          : range === 'year'
            ? new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/London',
                month: 'short',
              }).format(b.date)
            : formatLondonDayShortMonth(b.date),
      fullDate: b.date,
      carbon_kg: Number(b.carbon.toFixed(2)),
      kwh: Number(b.kwh.toFixed(2)),
    }));
}
