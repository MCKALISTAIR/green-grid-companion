/**
 * Centralized Logging Utility
 * 
 * Provides structured logging with environment awareness and Sentry integration.
 * Works seamlessly on both web and native platforms.
 * 
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * logger.debug('Debugging info', { userId: 123 });
 * logger.info('User action', { action: 'login' });
 * logger.warn('Potential issue', { status: 429 });
 * logger.error('Critical error', { error: new Error('Failed') });
 * ```
 */

import * as Sentry from '@sentry/react';
import { Capacitor } from '@capacitor/core';
import { getLoggerConfig, shouldLog, getLogColor, type LogLevel } from './logger.config';

interface LogContext {
    [key: string]: any;
}

class Logger {
    private config = getLoggerConfig();
    private isNative = Capacitor.isNativePlatform();

    /**
     * Log a debug message (development only)
     */
    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    /**
     * Log an informational message
     */
    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    /**
     * Log a warning message
     */
    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    /**
     * Log an error message and report to Sentry
     */
    error(message: string, context?: LogContext): void {
        this.log('error', message, context);

        // Report to Sentry if enabled
        if (this.config.enableSentry) {
            const error = context?.error instanceof Error
                ? context.error
                : new Error(message);

            Sentry.captureException(error, {
                level: 'error',
                extra: context,
                tags: {
                    platform: this.isNative ? 'native' : 'web',
                },
            });
        }
    }

    /**
     * Add a breadcrumb for better error context
     */
    breadcrumb(category: string, message: string, data?: LogContext): void {
        if (this.config.enableBreadcrumbs) {
            Sentry.addBreadcrumb({
                category,
                message,
                data,
                level: 'info',
                timestamp: Date.now() / 1000,
            });
        }
    }

    /**
     * Set user context for Sentry
     */
    setUser(user: { id?: string; email?: string;[key: string]: any }): void {
        if (this.config.enableSentry) {
            Sentry.setUser(user);
        }
    }

    /**
     * Clear user context
     */
    clearUser(): void {
        if (this.config.enableSentry) {
            Sentry.setUser(null);
        }
    }

    /**
     * Core logging method
     */
    private log(level: LogLevel, message: string, context?: LogContext): void {
        // Check if this log level should be logged
        if (!shouldLog(level, this.config)) {
            return;
        }

        // Skip console logging if disabled
        if (!this.config.enableConsole) {
            return;
        }

        // Prepare log message
        const timestamp = new Date().toISOString();
        const prefix = this.isNative ? '[Native]' : '[Web]';
        const formattedMessage = `${prefix} ${message}`;

        // Add breadcrumb for all logs (if enabled)
        if (this.config.enableBreadcrumbs && level !== 'debug') {
            this.breadcrumb(level, message, context);
        }

        // Output to console with appropriate method
        if (this.config.colorize) {
            // Colorized output for development
            const color = getLogColor(level);
            const style = `color: ${color}; font-weight: bold`;

            if (context) {
                console[level === 'debug' ? 'log' : level](
                    `%c[${level.toUpperCase()}]%c ${formattedMessage}`,
                    style,
                    'color: inherit',
                    context
                );
            } else {
                console[level === 'debug' ? 'log' : level](
                    `%c[${level.toUpperCase()}]%c ${formattedMessage}`,
                    style,
                    'color: inherit'
                );
            }
        } else {
            // Plain output for production
            const logFn = level === 'debug' ? console.log : console[level];
            if (context) {
                logFn(`[${level.toUpperCase()}] ${formattedMessage}`, context);
            } else {
                logFn(`[${level.toUpperCase()}] ${formattedMessage}`);
            }
        }
    }
}

// Export singleton instance
export const logger = new Logger();
