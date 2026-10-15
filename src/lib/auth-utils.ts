import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

/**
 * Ensures the user has a valid Supabase session (authenticated or anonymous).
 *
 * This enables users to use integrations like Octopus Energy
 * without requiring Google/Apple sign-in. When they later authenticate,
 * the AccountBackup component automatically migrates their data.
 *
 * @returns Promise<Session | null> - The current or newly created session, or null if creation fails
 */
export async function ensureAuthSession() {
  // Check if user already has a session (authenticated or anonymous)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    logger.debug('Auth session exists', {
      isAnonymous: session.user?.is_anonymous,
      userId: session.user?.id?.substring(0, 8) + '...',
    });
    return session;
  }

  // No session - try to create an anonymous one
  logger.info('Creating anonymous authentication session');

  try {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      logger.warn('Failed to create anonymous session', { error: error.message });
      return null;
    }

    if (!data.session) {
      logger.warn('Anonymous sign-in returned no session');
      return null;
    }

    logger.info('Anonymous session created successfully', {
      userId: data.session.user?.id?.substring(0, 8) + '...',
    });

    return data.session;
  } catch (error) {
    logger.warn('Exception creating anonymous session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Check if the current user is authenticated (not anonymous)
 *
 * @returns Promise<boolean> - True if user is authenticated with Google/Apple
 */
export async function isAuthenticated(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return false;
  }

  // Anonymous users have is_anonymous = true
  return !session.user?.is_anonymous;
}

/**
 * Get the current user ID (anonymous or authenticated)
 *
 * @returns Promise<string | null> - User ID or null if no session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Check if anonymous session should be converted to authenticated
 * This is used to show prompts to encourage users to sign in
 *
 * @returns Promise<boolean> - True if user should be encouraged to authenticate
 */
export async function shouldPromptForAuth(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return false; // No session at all, don't prompt yet
  }

  // Only prompt anonymous users who have been using the app
  return session.user?.is_anonymous === true;
}

/**
 * Check if we have a valid session (any type)
 *
 * @returns Promise<boolean> - True if there's any valid session
 */
export async function hasValidSession(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
}
