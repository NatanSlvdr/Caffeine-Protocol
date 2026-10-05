import { useSyncExternalStore } from 'react';
import { UPDATE_MESSAGE } from '@/shared/offline-manifest';
import { reloadPage } from '@/shared/lib/navigation';

/**
 * A newer build of the café, installed for offline play and waiting to take over. It does on its own once every tab
 * of the café has closed; until then this tab keeps the build it opened with, so nothing changes mid-session unless
 * the player asks.
 */
let waiting: ServiceWorker | null = null;
let worker: Pick<ServiceWorkerContainer, 'controller' | 'addEventListener'> | null = null;
const listeners = new Set<() => void>();
const set = (next: ServiceWorker | null) => {
  waiting = next;
  for (const listener of listeners) listener();
};

/** Register the offline worker, and watch for a newer build to finish installing behind it. */
export function registerOfflineCafe(
  container: Pick<ServiceWorkerContainer, 'register' | 'controller' | 'addEventListener'>,
  url: string,
): Promise<void> {
  worker = container;
  set(null);
  // Without a controller this is the café's first install, which takes over at once: there is nothing to update.
  const offer = (candidate: ServiceWorker) => {
    if (candidate.state === 'installed' && container.controller) set(candidate);
    // Another tab updated, or a later build replaced this one: it's no longer waiting.
    else if (waiting === candidate && candidate.state !== 'installed') set(null);
  };
  const watch = (candidate: ServiceWorker) => {
    offer(candidate);
    candidate.addEventListener('statechange', () => offer(candidate));
  };
  return container
    .register(url)
    .then((registration) => {
      if (registration.waiting) watch(registration.waiting);
      if (registration.installing) watch(registration.installing);
      registration.addEventListener('updatefound', () => {
        if (registration.installing) watch(registration.installing);
      });
    })
    .catch(() => {
      /* The loaded game still works when offline storage is unavailable. */
    });
}

/** Switch to the waiting build now, reloading this tab onto it once it has taken over. */
export function updateNow(): void {
  if (!waiting || !worker) return;
  worker.addEventListener('controllerchange', reloadPage, { once: true });
  waiting.postMessage(UPDATE_MESSAGE);
}

/** Whether a newer build is installed and waiting for the player. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waiting !== null,
  );
}
