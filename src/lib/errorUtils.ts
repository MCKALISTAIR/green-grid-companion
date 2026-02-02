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
export function parseEdgeFunctionError(error: any, context?: ErrorContext): string {
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
    } else if (error?.message) {
        errorMessage = error.message;
    } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : error.error.message || '';
    }

    const lowerMessage = errorMessage.toLowerCase();

    // Handle the generic "Edge function returned a non-2xx status code" error
    if (lowerMessage.includes('edge function') && lowerMessage.includes('non-2xx')) {
        return getContextualErrorMessage(context, error);
    }

    // Handle specific HTTP status codes
    if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
        if (context?.feature === 'octopus') {
            return 'Invalid Octopus Energy credentials. Please check your API key and account number.';
        }
        if (context?.feature === 'tesla') {
            return 'Tesla authentication expired. Please reconnect your account.';
        }
        return 'Authentication failed. Please sign in again.';
    }

    if (lowerMessage.includes('403') || lowerMessage.includes('forbidden')) {
        if (context?.feature === 'octopus') {
            return 'Access denied. Check your Octopus Energy API permissions.';
        }
        return "You don't have permission to access this.";
    }

    if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
        if (context?.feature === 'octopus' && context?.action === 'link') {
            return 'No meters found. Check your account number is correct.';
        }
        return 'The requested data could not be found.';
    }

    if (lowerMessage.includes('429') || lowerMessage.includes('rate limit')) {
        return 'Too many requests. Please wait a moment and try again.';
    }

    if (lowerMessage.includes('500') || lowerMessage.includes('502') || lowerMessage.includes('503')) {
        if (context?.feature === 'octopus') {
            return 'Octopus Energy service is temporarily unavailable. Please try again in a few minutes.';
        }
        if (context?.feature === 'tesla') {
            return 'Tesla service is temporarily unavailable. Please try again in a few minutes.';
        }
        return 'The service is temporarily unavailable. Please try again later.';
    }

    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
        return 'Request timed out. Please check your connection and try again.';
    }

    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
        return "Connection failed. Please check your internet connection.";
    }

    // If we have a specific, readable error message, return it
    if (errorMessage && !lowerMessage.includes('edge function') && errorMessage.length > 0 && errorMessage.length < 150) {
        return errorMessage;
    }

    // Fallback to contextual error
    return getContextualErrorMessage(context, error);
}

/**
 * Get a contextual error message based on the feature and action
 */
function getContextualErrorMessage(context?: ErrorContext, error?: any): string {
    if (!context?.feature) {
        return 'Something went wrong. Please try again.';
    }

    const action = context.action || 'complete';

    switch (context.feature) {
        case 'octopus':
            switch (action) {
                case 'save':
                    return 'Failed to save Octopus Energy credentials. Check they are correct and try again.';
                case 'link':
                    return 'Failed to link your meter. Verify your account details and try again.';
                case 'sync':
                    return 'Failed to sync consumption data. Please try again.';
                case 'disconnect':
                    return 'Failed to disconnect. Please try again.';
                case 'calculate':
                    return 'Failed to calculate carbon footprint. Please try again.';
                default:
                    return 'Failed to connect to Octopus Energy. Please check your credentials.';
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
            return 'Failed to update notification settings. Please try again.';

        case 'location':
            return 'Failed to update location. Please try again.';

        case 'data':
            return 'Failed to load data. Please check your connection and try again.';

        case 'auth':
            return 'Authentication failed. Please sign in again.';

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
            title: "You're Offline",
            description: "We couldn't connect to the grid data.",
            steps: [
                "Check your Wi-Fi or mobile data connection",
                "Disable Airplane mode if it's on",
                "Try refreshing the page"
            ],
            isOffline: true,
        };
    }

    // Convert error to string for checking
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Timeout errors
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
        return {
            title: 'Request Timeout',
            description: 'The server took too long to respond.',
            steps: [
                "Check your internet speed",
                "Wait a moment and try again",
            ]
        };
    }

    // Network/fetch errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
        return {
            title: 'Connection Failed',
            description: "We couldn't reach the Carbon Intensity server.",
            steps: [
                "Check your internet connection",
                "The API might be down temporarily",
                "Try again in a few minutes"
            ]
        };
    }

    // Permission/auth errors
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
        return {
            title: 'Access Denied',
            description: "You don't have permission to access this data.",
            steps: [
                "Try signing out and signing back in",
                "Check if your session has expired"
            ]
        };
    }

    // API/server errors
    if (lowerMessage.includes('500') || lowerMessage.includes('server error')) {
        return {
            title: 'Server Error',
            description: 'The National Grid service is having issues.',
            steps: [
                "This is not your fault",
                "Services usually recover within minutes",
                "Try again later"
            ]
        };
    }

    // Rate limiting
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
        return {
            title: 'Too Many Requests',
            description: 'You are sending too many requests.',
            steps: [
                "Wait a moment before trying again",
                "Don't refresh too quickly"
            ]
        };
    }

    // Default error
    return {
        title: 'Something Went Wrong',
        description: 'We encountered an unexpected error.',
        steps: [
            "Try refreshing the app",
            "Clear your cache if the issue persists"
        ]
    };
}

/**
 * Check if error is a network-related issue
 */
export function isNetworkError(error: unknown): boolean {
    if (!navigator.onLine) return true;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    return lowerMessage.includes('network') ||
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('timeout');
}
