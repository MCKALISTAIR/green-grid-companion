/**
 * Utility functions for handling and categorizing errors
 */

export interface ErrorInfo {
  title: string;
  description: string;
  steps?: string[];
  isOffline?: boolean;
}

/**
 * Context information for better error messages
 */
export interface ErrorContext {
  feature?: 'octopus' | 'tesla' | 'notifications' | 'location' | 'data' | 'auth';
  action?: 'save' | 'fetch' | 'sync' | 'link' | 'disconnect' | 'calculate';
}

/**
 * Extract user-friendly error message from Supabase edge function errors
 */
export function parseEdgeFunctionError(error: unknown, context?: ErrorContext): string {
  // Check if offline first
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return "You're offline. Check your connection and try again.";
  }

  // Extract the actual error message
  let errorMessage = '';

  // Try to get the error from various possible locations in the response
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    errorMessage = error.message;
  } else if (error && typeof error === 'object' && 'error' in error) {
    const errorObj = error.error;
    errorMessage =
      typeof errorObj === 'string'
        ? errorObj
        : errorObj && typeof errorObj === 'object' && 'message' in errorObj
          ? String(errorObj.message)
          : '';
  }

  const lowerMessage = errorMessage.toLowerCase();

  // Handle the generic "Edge function returned a non-2xx status code" error
  if (lowerMessage.includes('edge function') && lowerMessage.includes('non-2xx')) {
    return getContextualErrorMessage(context, error);
  }

  // Handle specific HTTP status codes
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
    if (context?.feature === 'octopus') {
      return "Octopus didn't accept those details. Check your API key and account number.";
    }
    if (context?.feature === 'tesla') {
      return 'Tesla authentication expired. Please reconnect your account.';
    }
    return "Couldn't confirm it's you. Please sign in again.";
  }

  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden')) {
    if (context?.feature === 'octopus') {
      return 'Octopus refused access. Check your API key.';
    }
    return "You don't have permission to access this.";
  }

  if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    if (context?.feature === 'octopus' && context?.action === 'link') {
      return 'No meters on that account. Check the account number.';
    }
    return "We couldn't find that data.";
  }

  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit')) {
    return "That's a lot of tries. Wait a moment, then try again.";
  }

  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503')
  ) {
    if (context?.feature === 'octopus') {
      return "Octopus isn't answering just now. Try again in a few minutes.";
    }
    if (context?.feature === 'tesla') {
      return 'Tesla service is temporarily unavailable. Please try again in a few minutes.';
    }
    return "This service isn't answering right now. Try again later.";
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'That took too long. Check your connection and try again.';
  }

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
    return "Couldn't connect. Check your internet connection.";
  }

  // If we have a specific, readable error message, return it
  if (
    errorMessage &&
    !lowerMessage.includes('edge function') &&
    errorMessage.length > 0 &&
    errorMessage.length < 150
  ) {
    return errorMessage;
  }

  // Fallback to contextual error
  return getContextualErrorMessage(context, error);
}

/**
 * Get a contextual error message based on the feature and action
 */
function getContextualErrorMessage(context?: ErrorContext, _error?: unknown): string {
  if (!context?.feature) {
    return 'Something went wrong. Please try again.';
  }

  const action = context.action || 'complete';

  switch (context.feature) {
    case 'octopus':
      switch (action) {
        case 'save':
          return "Couldn't save your Octopus details. Check them and try again.";
        case 'link':
          return "Couldn't link your meter. Check your account details and try again.";
        case 'sync':
          return "Couldn't sync your usage. Please try again.";
        case 'disconnect':
          return "Couldn't disconnect. Please try again.";
        case 'calculate':
          return "Couldn't work out your footprint. Please try again.";
        default:
          return "Couldn't connect to Octopus. Check your API key and account number.";
      }

    case 'tesla':
      switch (action) {
        case 'link':
          return 'Failed to connect Tesla account. Please try again.';
        case 'sync':
          return 'Failed to sync Tesla data. Please try again.';
        case 'disconnect':
          return 'Failed to disconnect Tesla account. Please try again.';
        default:
          return 'Tesla connection failed. Please try again.';
      }

    case 'notifications':
      return "Couldn't update your notification settings. Please try again.";

    case 'location':
      return "Couldn't update your location. Please try again.";

    case 'data':
      return "Couldn't load data. Check your connection and try again.";

    case 'auth':
      return "Couldn't confirm it's you. Please sign in again.";

    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Determine the type of error and return appropriate user-facing messages
 * @deprecated Use parseEdgeFunctionError with context for better error messages
 */
export function getErrorInfo(error: unknown): ErrorInfo {
  // Check if offline first
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      title: "You're offline",
      description: "We'll fetch your number when you're back.",
      steps: ['Check your Wi-Fi or mobile data', "Turn off Airplane mode if it's on"],
      isOffline: true,
    };
  }

  // Convert error to string for checking
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      title: 'That took too long',
      description: "The carbon intensity service didn't answer in time.",
      steps: ['Try again in a moment'],
    };
  }

  // Network/fetch errors
  // An HTTP status in the message means we did reach the server: handled below.
  const hasHttpStatus = /:\s*\d{3}\b|\(\s*[\w ]*:\s*\d{3}\s*\)/.test(lowerMessage);
  if (
    !hasHttpStatus &&
    !lowerMessage.includes('too many requests') &&
    (lowerMessage.includes('network') || lowerMessage.includes('fetch'))
  ) {
    return {
      title: "Can't reach the grid data",
      description: "We couldn't reach the carbon intensity service.",
      steps: ['Check your connection', 'Try again in a few minutes'],
    };
  }

  // Permission/auth errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
    return {
      title: 'Not signed in',
      description: 'Your session may have run out.',
      steps: ['Sign out, then sign back in'],
    };
  }

  // API/server errors
  if (/\b5\d\d\b/.test(lowerMessage) || lowerMessage.includes('server error')) {
    return {
      title: "The data service isn't answering",
      description: "NESO's carbon intensity service is having a problem. It's not you.",
      steps: ['Try again in a few minutes'],
    };
  }

  // Response arrived but wasn't what NESO normally sends (malformed / empty)
  if (lowerMessage.includes('bad data') || error instanceof SyntaxError) {
    return {
      title: 'The data looks wrong',
      description: "NESO sent something we couldn't read. It's usually fixed within the hour.",
      steps: ['Try again in a few minutes'],
    };
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return {
      title: 'Too many refreshes',
      description: 'The data only changes every 30 minutes.',
      steps: ['Wait a moment, then try again'],
    };
  }

  // Default error
  return {
    title: 'Something went wrong',
    description: "We couldn't load this just now.",
    steps: ['If it keeps happening, close and reopen GridSense'],
  };
}

/**
 * Check if error is a network-related issue
 */
export function isNetworkError(error: unknown): boolean {
  if (!navigator.onLine) return true;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  return (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('timeout')
  );
}
