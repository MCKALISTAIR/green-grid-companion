import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    wasOffline: false,
  });

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({
        isOnline: true,
        isOffline: false,
        wasOffline: prev.isOffline, // Track if we were just offline
      }));
    };

    const handleOffline = () => {
      setState({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const clearWasOffline = useCallback(() => {
    setState((prev) => ({ ...prev, wasOffline: false }));
  }, []);

  return {
    ...state,
    clearWasOffline,
  };
}

// Service worker registration helper
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    logger.warn('Service workers not supported in this browser');
    return null;
  }

  // In development, a service worker can cache Vite's module graph and cause
  // hard-to-debug runtime issues (including hooks crashing and HTTP 412 pages).
  // Ensure no SW is controlling the page while developing.
  if (import.meta.env.DEV) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
      await clearCaches();
      logger.debug('Dev mode: service workers unregistered and caches cleared');
    } catch (error) {
      logger.warn('Dev mode: failed to unregister/clear caches', { error });
    }
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    logger.info('Service worker registered', { scope: registration.scope });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available, notify user
            logger.info('New service worker content available');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    logger.error('Service worker registration failed', { error });
    return null;
  }
}

// Request to skip waiting and activate new service worker
export function skipWaiting(): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage('skipWaiting');
  }
}

// Clear all caches
export async function clearCaches(): Promise<void> {
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    logger.debug('All caches cleared');
  }
}
