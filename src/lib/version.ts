/**
 * Application version configuration
 * 
 * Update this file when making releases:
 * - MAJOR: Breaking changes or major new features
 * - MINOR: New features, enhancements
 * - PATCH: Bug fixes, small improvements
 * 
 * Stage: 'alpha' | 'beta' | 'rc' | 'stable'
 */

export const APP_VERSION = {
  major: 1,
  minor: 6,
  patch: 0,
  stage: 'stable' as const,
};

export const VERSION_STRING = `v${APP_VERSION.major}.${APP_VERSION.minor}.${APP_VERSION.patch} ${APP_VERSION.stage.charAt(0).toUpperCase() + APP_VERSION.stage.slice(1)}`;

export const BUILD_DATE = new Date().toISOString().split('T')[0];
