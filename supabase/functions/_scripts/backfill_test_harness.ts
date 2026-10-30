/**
 * Test doubles for backfill-octopus-footprints.ts. In-memory only: no network,
 * no Supabase. The fake client mimics the slice of supabase-js the backfill
 * adapter uses and records every table operation so tests can prove which
 * tables were read and written.
 */
import { HALF_HOUR_MS, halfHourKey } from '../_shared/half-hour.ts';

export type Op = {
  table: string;
  op: 'select' | 'upsert' | 'insert' | 'update' | 'delete';
  onConflict?: string;
  rows?: number;
};

type Row = Record<string, unknown>;

/** Canonical DB spelling of an instant: PostgREST returns "…+00:00". */
export const dbStamp = (ms: number) => new Date(ms).toISOString().replace('.000Z', '+00:00');

export function makeFakeClient(tables: Record<string, Row[]>) {
  const ops: Op[] = [];
  const upserts: Array<{ table: string; rows: Row[]; onConflict?: string }> = [];
  const from = (table: string) => {
    const filters: Array<(r: Row) => boolean> = [];
    let orderCol: string | null = null;
    let asc = true;
    let limit = Infinity;
    const run = () => {
      ops.push({ table, op: 'select' });
      let rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      if (orderCol) {
        const c = orderCol;
        rows = [...rows].sort((a, b) => {
          const ka = halfHourKey(a[c] as string) ?? String(a[c]);
          const kb = halfHourKey(b[c] as string) ?? String(b[c]);
          return (ka < kb ? -1 : ka > kb ? 1 : 0) * (asc ? 1 : -1);
        });
      }
      return { data: rows.slice(0, limit).map((r) => ({ ...r })), error: null };
    };
    const builder = {
      select: () => builder,
      eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), builder),
      gt: (col: string, v: string) => (
        filters.push((r) => (halfHourKey(r[col] as string) ?? 0) > (halfHourKey(v) ?? 0)),
        builder
      ),
      order: (col: string, o?: { ascending?: boolean }) => (
        (orderCol = col),
        (asc = o?.ascending !== false),
        builder
      ),
      limit: (n: number) => ((limit = n), builder),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(run()).then(res, rej),
      upsert: (rows: Row[], o?: { onConflict?: string }) => {
        ops.push({ table, op: 'upsert', onConflict: o?.onConflict, rows: rows.length });
        upserts.push({ table, rows: rows.map((r) => ({ ...r })), onConflict: o?.onConflict });
        const t = (tables[table] ??= []);
        for (const r of rows) {
          const k = halfHourKey(r.interval_start as string);
          const i = t.findIndex(
            (x) => x.mpan === r.mpan && halfHourKey(x.interval_start as string) === k,
          );
          // Postgres stores numeric(…,4) / integer: mimic so re-reads compare like the DB.
          const stored = {
            ...r,
            consumption_kwh: Math.round(Number(r.consumption_kwh) * 1e4) / 1e4,
            carbon_g: Math.round(Number(r.carbon_g) * 1e4) / 1e4,
            intensity_gco2_kwh: Math.round(Number(r.intensity_gco2_kwh)),
          };
          if (i >= 0) t[i] = { ...t[i], ...stored };
          else t.push({ ...stored, created_at: 'run' });
        }
        return Promise.resolve({ error: null });
      },
      insert: () => (ops.push({ table, op: 'insert' }), Promise.resolve({ error: null })),
      update: () => (ops.push({ table, op: 'update' }), builder),
      delete: () => (ops.push({ table, op: 'delete' }), builder),
    };
    return builder;
  };
  return { client: { from }, ops, upserts, tables };
}

/** DB-spelled consumption rows for every half-hour in [fromMs, toMs). */
export function consumptionRows(mpan: string, fromMs: number, toMs: number, kwh = 0.25): Row[] {
  const out: Row[] = [];
  for (let t = fromMs; t < toMs; t += HALF_HOUR_MS) {
    out.push({
      mpan,
      interval_start: dbStamp(t),
      interval_end: dbStamp(t + HALF_HOUR_MS),
      consumption_kwh: kwh,
    });
  }
  return out;
}

/** A fake clock + sleep that advances it, so pacing/backoff are observable without waiting. */
export function fakeClock(start = 0) {
  let now = start;
  const sleeps: number[] = [];
  return {
    now: () => now,
    sleep: (ms: number) => {
      sleeps.push(ms);
      now += ms;
      return Promise.resolve();
    },
    sleeps,
  };
}
