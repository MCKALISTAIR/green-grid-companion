/**
 * Centralized route configuration for the application
 */
export const ROUTES = {
    HOME: '/',
    AUTH_CALLBACK: '/auth/callback',
    PLANNER: '/planner',
    SETTINGS: '/settings',
    LEADERBOARD: '/leaderboard',
    FEATURE_GUIDES: '/feature-guides',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];
