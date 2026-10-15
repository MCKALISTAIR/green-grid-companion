/**
 * Older app versions cached the raw Octopus API key in localStorage
 * (`octopus-cached-real-creds`) and flagged keys that never reached the server
 * with `octopus-pending-sync`. API keys are now held server-side only
 * (encrypted at rest), so these entries must be removed from every device.
 */
export const LEGACY_OCTOPUS_STORAGE_KEYS = {
  credentials: 'octopus-cached-real-creds',
  pendingSync: 'octopus-pending-sync',
} as const;

export interface LegacyOctopusCredentials {
  apiKey: string;
  accountNumber: string;
}

export interface LegacyOctopusTakeResult {
  /** Credentials found in storage (already removed from storage). */
  credentials: LegacyOctopusCredentials | null;
  /** True if the old app never managed to upload these credentials. */
  pendingSync: boolean;
}

type StorageLike = Pick<Storage, 'getItem' | 'removeItem'>;

/**
 * Read and ALWAYS remove any legacy Octopus credentials from storage.
 * The caller decides whether to upload them once (only needed when
 * `pendingSync` is true); they are never written back to the device.
 */
export function takeLegacyOctopusCredentials(
  storage: StorageLike | null | undefined,
): LegacyOctopusTakeResult {
  if (!storage) return { credentials: null, pendingSync: false };

  let raw: string | null = null;
  let pendingSync = false;
  try {
    raw = storage.getItem(LEGACY_OCTOPUS_STORAGE_KEYS.credentials);
    pendingSync = storage.getItem(LEGACY_OCTOPUS_STORAGE_KEYS.pendingSync) === 'true';
  } finally {
    try {
      storage.removeItem(LEGACY_OCTOPUS_STORAGE_KEYS.credentials);
      storage.removeItem(LEGACY_OCTOPUS_STORAGE_KEYS.pendingSync);
    } catch {
      // Storage unavailable (private mode etc.) - nothing persisted then.
    }
  }

  if (!raw) return { credentials: null, pendingSync: false };

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.apiKey === 'string' && typeof parsed.accountNumber === 'string') {
      return {
        credentials: { apiKey: parsed.apiKey, accountNumber: parsed.accountNumber },
        pendingSync,
      };
    }
  } catch {
    // Corrupt entry - already removed.
  }
  return { credentials: null, pendingSync: false };
}
