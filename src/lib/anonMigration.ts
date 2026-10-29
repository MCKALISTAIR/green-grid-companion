/**
 * BH-127: move an anonymous user's Octopus data to their Google/Apple account
 * after sign-in, wherever the sign-in lands.
 *
 * Before sign-in, AccountBackup stores the anonymous user's id under
 * ANON_USER_ID_KEY. The migration used to run only from AccountBackup's own
 * SIGNED_IN listener, which is mounted on Settings. A web OAuth return lands on
 * "/" and main.tsx stores the session before the first render, so that event
 * was never seen and migrate-data never ran: the anonymous Octopus link stayed
 * on the old user id and the account looked empty. This listener is installed
 * once at startup and also handles INITIAL_SESSION (session already stored).
 */
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export const ANON_USER_ID_KEY = 'octopus-anon-user-id';

export interface MigrationResult {
  credentials?: boolean;
  meters?: number;
  footprint_records?: number;
}

export interface AnonMigrationDeps {
  onAuthStateChange(cb: (event: AuthChangeEvent, session: Session | null) => void): unknown;
  invoke(previousUserId: string): Promise<{ data: unknown; error: unknown }>;
  storage: Pick<Storage, 'getItem' | 'removeItem'>;
  onMigrated?: (result: MigrationResult) => void;
  onError?: (error: unknown) => void;
}

/** Run migrate-data once for a signed-in (non-anonymous) session, if an anon id is stored. */
export async function migrateAnonData(
  session: Session | null,
  deps: Omit<AnonMigrationDeps, 'onAuthStateChange'>,
): Promise<boolean> {
  const user = session?.user;
  if (!user || user.is_anonymous) return false;
  const storedAnonId = deps.storage.getItem(ANON_USER_ID_KEY);
  if (!storedAnonId) return false;
  if (storedAnonId === user.id) {
    deps.storage.removeItem(ANON_USER_ID_KEY);
    return false;
  }
  // Clear first so a second auth event can't start a duplicate migration.
  deps.storage.removeItem(ANON_USER_ID_KEY);
  try {
    const { data, error } = await deps.invoke(storedAnonId);
    if (error) {
      deps.onError?.(error);
      return false;
    }
    const migrated = (data as { migrated?: MigrationResult } | null)?.migrated;
    if (migrated) deps.onMigrated?.(migrated);
    return true;
  } catch (e) {
    deps.onError?.(e);
    return false;
  }
}

export function installAnonMigration(deps: AnonMigrationDeps): void {
  deps.onAuthStateChange((event, session) => {
    if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
    // Don't call supabase from inside the auth callback (it holds the auth lock).
    setTimeout(() => void migrateAnonData(session, deps), 0);
  });
}
