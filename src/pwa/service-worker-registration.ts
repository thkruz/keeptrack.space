import { errorManagerInstance } from '@app/engine/utils/errorManager';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Registers the service worker and sets up periodic update checks.
 * The early inline script in index.html handles the initial update check
 * and controllerchange reload — this function handles registration and
 * mid-session updates detected via the periodic interval.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Embedded deployments (companion WebView) opt out entirely — a service
  // worker scoped inside the host app would cache-shadow its assets.
  if (typeof settingsManager !== 'undefined' && settingsManager?.isDisableServiceWorker) {
    return;
  }

  if (window.location.protocol !== 'https:') {
    return;
  }

  navigator.serviceWorker
    .register('./serviceWorker.js')
    .then((registration) => {
      // Check for updates periodically — KeepTrack is an SPA with no
      // page navigations, so the browser's automatic check on navigate
      // never fires after initial load.
      setInterval(() => {
        registration.update().catch(() => {
          // Silently ignore update check failures (offline, etc.)
        });
      }, UPDATE_CHECK_INTERVAL_MS);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (!newWorker) {
          return;
        }

        newWorker.addEventListener('statechange', () => {
          // Auto-activate when the new SW is waiting AND there is
          // an existing controller (i.e. this is an update, not first install).
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    })
    .catch((err: unknown) => {
      errorManagerInstance.warn('Service worker registration failed:', err);
    });
}
