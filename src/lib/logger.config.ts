/**
 * Logger Configuration
 * Environment-based settings for the logging system
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableSentry: boolean;
  enableBreadcrumbs: boolean;
  colorize: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Determine if we're in development mode
 */
const isDevelopment = import.meta.env.DEV;

/**
 * Development configuration: verbose logging, no Sentry
 */
const developmentConfig: LoggerConfig = {
  minLevel: 'debug',
  enableConsole: true,
  enableSentry: false, // Don't send to Sentry in dev
  enableBreadcrumbs: true,
  colorize: true,
};

/**
 * Production configuration: minimal logging, Sentry enabled
 */
const productionConfig: LoggerConfig = {
  minLevel: 'warn',
  enableConsole: true,
  enableSentry: true,
  enableBreadcrumbs: true,
  colorize: false,
};

/**
 * Get the current logger configuration based on environment
 */
export const getLoggerConfig = (): LoggerConfig => {
  return isDevelopment ? developmentConfig : productionConfig;
};

/**
 * Check if a log level should be logged based on config
 */
export const shouldLog = (level: LogLevel, config: LoggerConfig): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
};

/**
 * Get color for console output (development only)
 */
export const getLogColor = (level: LogLevel): string => {
  const colors: Record<LogLevel, string> = {
    debug: '#6B7280', // gray
    info: '#3B82F6', // blue
    warn: '#F59E0B', // amber
    error: '#EF4444', // red
  };
  return colors[level];
};
