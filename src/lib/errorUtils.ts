/**
 * Utility functions for handling and categorizing errors
 */

export interface ErrorInfo {
    title: string;
    description: string;
    isOffline?: boolean;
}

/**
 * Determine the type of error and return appropriate user-facing messages
 */
export function getErrorInfo(error: unknown): ErrorInfo {
    // Check if offline first
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return {
            title: "You're Offline",
            description: "Check your internet connection and try again.",
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
            description: 'The server took too long to respond. Please try again.',
        };
    }

    // Network/fetch errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
        return {
            title: 'Connection Failed',
            description: "We couldn't reach the server. Please check your connection.",
        };
    }

    // Permission/auth errors
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
        return {
            title: 'Access Denied',
            description: "You don't have permission to access this data.",
        };
    }

    // API/server errors
    if (lowerMessage.includes('500') || lowerMessage.includes('server error')) {
        return {
            title: 'Server Error',
            description: 'The service is having issues. Please try again later.',
        };
    }

    // Rate limiting
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
        return {
            title: 'Too Many Requests',
            description: 'Please wait a moment before trying again.',
        };
    }

    // Default error
    return {
        title: 'Something Went Wrong',
        description: 'We encountered an unexpected error. Please try again.',
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
