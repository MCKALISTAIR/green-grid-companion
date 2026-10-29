import { describe, it, expect, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import {
  ANON_USER_ID_KEY,
  installAnonMigration,
  migrateAnonData,
  rememberAnonUserId,
} from './anonMigration';

const session = (id: string, anon = false) =>
  ({ user: { id, is_anonymous: anon } }) as unknown as Session;

function memStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

describe('migrateAnonData (BH-129)', () => {
  it('migrates the stored anon id to the signed-in user and clears it', async () => {
    const storage = memStorage({ [ANON_USER_ID_KEY]: 'anon-1' });
    const invoke = vi.fn().mockResolvedValue({ data: { migrated: { meters: 2 } }, error: null });
    const onMigrated = vi.fn();
    expect(await migrateAnonData(session('user-1'), { invoke, storage, onMigrated })).toBe(true);
    expect(invoke).toHaveBeenCalledWith('anon-1');
    expect(onMigrated).toHaveBeenCalledWith({ meters: 2 });
    expect(storage.m.has(ANON_USER_ID_KEY)).toBe(false);
  });

  it('does nothing for anonymous sessions, no session, or no stored id', async () => {
    const invoke = vi.fn();
    const storage = memStorage({ [ANON_USER_ID_KEY]: 'anon-1' });
    expect(await migrateAnonData(session('anon-1', true), { invoke, storage })).toBe(false);
    expect(await migrateAnonData(null, { invoke, storage })).toBe(false);
    expect(await migrateAnonData(session('u'), { invoke, storage: memStorage() })).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
    expect(storage.m.get(ANON_USER_ID_KEY)).toBe('anon-1');
  });

  it('clears a stored id equal to the current user without calling the server', async () => {
    const invoke = vi.fn();
    const storage = memStorage({ [ANON_USER_ID_KEY]: 'u' });
    expect(await migrateAnonData(session('u'), { invoke, storage })).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
    expect(storage.m.has(ANON_USER_ID_KEY)).toBe(false);
  });

  it('reports errors and never throws', async () => {
    const onError = vi.fn();
    const storage = memStorage({ [ANON_USER_ID_KEY]: 'a' });
    const invoke = vi.fn().mockRejectedValue(new Error('net'));
    expect(await migrateAnonData(session('u'), { invoke, storage, onError })).toBe(false);
    expect(onError).toHaveBeenCalled();
  });
});

describe('installAnonMigration', () => {
  it('runs once on INITIAL_SESSION and ignores a repeat SIGNED_IN', async () => {
    vi.useFakeTimers();
    let cb: (e: string, s: Session | null) => void = () => {};
    const storage = memStorage({ [ANON_USER_ID_KEY]: 'anon-1' });
    const invoke = vi.fn().mockResolvedValue({ data: {}, error: null });
    installAnonMigration({
      onAuthStateChange: (fn) => (cb = fn as typeof cb),
      invoke,
      storage,
    });
    cb('INITIAL_SESSION', session('u'));
    cb('SIGNED_IN', session('u'));
    cb('TOKEN_REFRESHED', session('u'));
    await vi.runAllTimersAsync();
    expect(invoke).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('rememberAnonUserId (BH-130)', () => {
  const store = (init: Record<string, string> = {}) => {
    const m = new Map(Object.entries(init));
    return {
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      m,
    };
  };

  it('stores an anonymous user id', () => {
    const s = store();
    expect(rememberAnonUserId({ id: 'anon-1', is_anonymous: true }, s)).toBe(true);
    expect(s.m.get(ANON_USER_ID_KEY)).toBe('anon-1');
  });

  it('never stores a Google/Apple user id (server would refuse), and clears a stale one', () => {
    const s = store({ [ANON_USER_ID_KEY]: 'old' });
    expect(rememberAnonUserId({ id: 'google-1', is_anonymous: false }, s)).toBe(false);
    expect(s.m.has(ANON_USER_ID_KEY)).toBe(false);
  });

  it('treats a missing is_anonymous flag as not anonymous', () => {
    const s = store();
    expect(rememberAnonUserId({ id: 'u-1' }, s)).toBe(false);
    expect(rememberAnonUserId(null, s)).toBe(false);
    expect(s.m.size).toBe(0);
  });
});
