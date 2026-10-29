/**
 * In-memory stand-in for a service-role supabase client, for delete-account and
 * export-data tests. Every query is recorded; every filter call is chainable and
 * the query resolves to { data, error: null }.
 */
export interface RecordedQuery {
  table: string;
  op: string;
  filters: Array<[string, string, unknown]>;
}

export function fakeAdmin(rows: Record<string, unknown[]> = {}) {
  const queries: RecordedQuery[] = [];
  const deletedUsers: string[] = [];
  const from = (table: string) => {
    const q: RecordedQuery = { table, op: 'select', filters: [] };
    queries.push(q);
    const result = () => Promise.resolve({ data: rows[table] ?? [], error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      delete: () => ((q.op = 'delete'), chain),
      eq: (col: string, v: unknown) => (q.filters.push(['eq', col, v]), chain),
      in: (col: string, v: unknown) => (q.filters.push(['in', col, v]), chain),
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: (rows[table] ?? [])[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: (rows[table] ?? [])[0] ?? null, error: null }),
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => result().then(ok, bad),
    };
    return chain;
  };
  return {
    client: {
      from,
      auth: {
        admin: {
          deleteUser: (id: string) => (deletedUsers.push(id), Promise.resolve({ error: null })),
        },
      },
    },
    queries,
    deletedUsers,
  };
}

export const USER = { id: 'user-aaaa-1111', email: 'a@example.com', app_metadata: {} };

/** getUser double: accepts only `good-token`. */
export function fakeGetUser(seen: string[] = []) {
  return (token: string) => {
    seen.push(token);
    return Promise.resolve(
      token === 'good-token'
        ? { data: { user: USER }, error: null }
        : { data: { user: null }, error: { message: 'invalid JWT' } },
    );
  };
}
