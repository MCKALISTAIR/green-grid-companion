/**
 * BH-27: the weekly digest's "Best time today" comes from the subscriber's
 * regional NESO forecast, considers future slots only, and is formatted in UK
 * time (Europe/London), not the Deno runtime's UTC.
 */
export interface Slot {
  from: string;
  to: string;
  intensity: { forecast: number | null; index?: string };
}

/** NESO national responses are { data: Slot[] }; regional are { data: { data: Slot[] } } or { data: [{ data: Slot[] }] }. */
export function extractSlots(json: unknown): Slot[] {
  const d = (json as { data?: unknown } | null)?.data as
    Slot[] | { data?: Slot[] } | Array<{ data?: Slot[] }> | undefined;
  if (Array.isArray(d) && d.length && Array.isArray((d[0] as { data?: Slot[] })?.data))
    return (d[0] as { data: Slot[] }).data;
  if (d && !Array.isArray(d) && Array.isArray(d.data)) return d.data;
  return Array.isArray(d) ? (d as Slot[]) : [];
}

export function bestFutureSlot(slots: Slot[], now: Date): Slot | null {
  let best: Slot | null = null;
  for (const s of slots) {
    const f = s?.intensity?.forecast;
    if (typeof f !== 'number' || !Number.isFinite(f)) continue;
    if (new Date(s.to).getTime() <= now.getTime()) continue;
    if (!best || f < (best.intensity.forecast as number)) best = s;
  }
  return best;
}

export function formatLondonTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** Outward code (e.g. "EH1" from "EH1 1AA"), or null. */
export function outwardCode(postcode: string | null | undefined): string | null {
  const p = (postcode ?? '').trim().toUpperCase();
  if (!p || p === 'GB') return null;
  const out = p.split(/\s+/)[0];
  return /^[A-Z]{1,2}\d[A-Z\d]?$/.test(out) ? out : null;
}

export function forecastUrl(outcode: string | null, now: Date): string {
  if (!outcode)
    return (
      'https://api.carbonintensity.org.uk/intensity/' + now.toISOString().slice(0, 16) + 'Z/fw24h'
    );
  return `https://api.carbonintensity.org.uk/regional/intensity/${now.toISOString().slice(0, 16)}Z/fw24h/postcode/${outcode}`;
}
