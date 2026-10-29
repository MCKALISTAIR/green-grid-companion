/**
 * Access rules for the push-subscriptions function (BH-149).
 *
 * Every call needs a valid Supabase session (anonymous sessions count). A
 * row owned by a user can only be read, changed or deleted by that user. A
 * legacy row with no owner can be read or deleted by any signed-in caller who
 * holds the device token, and an upsert claims it for that caller, so after
 * one save no other session can touch it.
 *
 * There is no device attestation: the old stub accepted every request, so the
 * claim has been dropped rather than kept as false security.
 */
export type PushAction = 'get' | 'upsert' | 'delete';

export const PUSH_USER_LIMIT = 30; // per minute per user
export const PUSH_IP_LIMIT = 60; // per minute per IP
export const PUSH_WINDOW_SECONDS = 60;

export function canAccessSubscription(
  existingOwner: string | null | undefined,
  callerId: string,
): boolean {
  if (!existingOwner) return true;
  return existingOwner === callerId;
}

/** The owner to store on upsert: always the caller. */
export function ownerForUpsert(callerId: string): string {
  return callerId;
}

/** A device token is opaque, but bound its size and characters. */
export function isPlausibleDeviceToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9:_\-.]{16,4096}$/.test(token);
}
