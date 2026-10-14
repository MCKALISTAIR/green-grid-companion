// Tiny in-memory stand-in for the supabase-js query builder, covering just the
// calls made by supabase/functions/_shared/octopus-credentials.ts.
// `schemaReady: false` simulates the window before the security migration is
// applied (new columns missing -> Postgres error 42703).

type Row = Record<string, unknown>;
const NEW_COLUMNS = ['api_key_encrypted', 'api_key_hint'];

export function createFakeCredentialsDb(opts: { schemaReady: boolean; rows?: Row[] }) {
  const state = {
    schemaReady: opts.schemaReady,
    rows: (opts.rows ?? []).map((r) => ({ ...r })),
    writes: [] as Row[],
  };

  const missingColumn = (cols: string[]) =>
    !state.schemaReady && cols.some((c) => NEW_COLUMNS.includes(c))
      ? {
          code: '42703',
          message: `column octopus_credentials.${cols.find((c) => NEW_COLUMNS.includes(c))} does not exist`,
        }
      : null;

  function from(table: string) {
    if (table !== 'octopus_credentials') throw new Error(`unexpected table ${table}`);
    return {
      select(columns: string, options?: { count?: string; head?: boolean }) {
        const cols = columns.split(',').map((c) => c.trim());
        const filters: Array<(r: Row) => boolean> = [];
        let limit = Infinity;
        const builder = {
          eq(col: string, v: unknown) {
            filters.push((r) => r[col] === v);
            return builder;
          },
          in(col: string, vs: unknown[]) {
            filters.push((r) => vs.includes(r[col]));
            return builder;
          },
          not(col: string, _op: string, _v: null) {
            filters.push((r) => r[col] != null);
            return builder;
          },
          is(col: string, _v: null) {
            const err = missingColumn([col]);
            if (err) cols.push(col);
            filters.push((r) => r[col] == null);
            return builder;
          },
          limit(n: number) {
            limit = n;
            return builder;
          },
          then(resolve: (v: unknown) => void) {
            const err = missingColumn(cols);
            if (err) return resolve({ data: null, error: err, count: null });
            const matched = state.rows.filter((r) => filters.every((f) => f(r))).slice(0, limit);
            if (options?.head) return resolve({ data: null, error: null, count: matched.length });
            resolve({
              data: matched.map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? null]))),
              error: null,
            });
          },
        };
        return builder;
      },
      update(values: Row) {
        const filters: Array<(r: Row) => boolean> = [];
        const cols = Object.keys(values);
        const builder = {
          eq(col: string, v: unknown) {
            filters.push((r) => r[col] === v);
            return builder;
          },
          is(col: string, _v: null) {
            cols.push(col);
            filters.push((r) => r[col] == null);
            return builder;
          },
          then(resolve: (v: unknown) => void) {
            const err = missingColumn(cols);
            if (err) return resolve({ error: err });
            state.rows
              .filter((r) => filters.every((f) => f(r)))
              .forEach((r) => Object.assign(r, values));
            resolve({ error: null });
          },
        };
        return builder;
      },
      upsert(record: Row) {
        const err = missingColumn(Object.keys(record));
        if (err) return Promise.resolve({ error: err });
        state.writes.push(record);
        const existing = state.rows.find((r) => r.user_id === record.user_id);
        if (existing) Object.assign(existing, record);
        else state.rows.push({ ...record });
        return Promise.resolve({ error: null });
      },
      insert(record: Row) {
        const err = missingColumn(Object.keys(record));
        if (err) return Promise.resolve({ error: err });
        if (state.rows.some((r) => r.user_id === record.user_id))
          return Promise.resolve({ error: { code: '23505', message: 'duplicate' } });
        state.writes.push(record);
        state.rows.push({ ...record });
        return Promise.resolve({ error: null });
      },
    };
  }

  return { db: { from }, state };
}
