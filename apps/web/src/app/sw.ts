import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';
import { isNeverCached } from '@/shared/pwa/never-cached';

/**
 * The service worker — what makes Chantia installable, and what answers when
 * the network does not.
 *
 * **What it caches: the application, never the data.** The shell — pages,
 * scripts, styles, fonts, icons — so the app opens fast and opens at all
 * without a network. Nothing the API answers: those responses carry an
 * organization's worksites, budgets and people, fetched with the user's token,
 * and a phone passed around a depot must not keep them in its Cache Storage
 * after its user signs out. One rule, placed before Serwist's defaults — the
 * first rule that matches wins — makes sure of it: `isNeverCached`, tested on
 * its own (the session handlers, and every other origin — the Nest API).
 *
 * Offline data — the timesheet queue — will be IndexedDB, written on purpose,
 * not a side effect of a cache.
 *
 * **Offline navigation** falls back to `/offline`, precached at install.
 *
 * **Updates** apply on their own: `skipWaiting` + `clientsClaim` let a new
 * version take over as soon as it is installed, so a deployment reaches every
 * installed app on its next launch — no store, no version stuck in a pocket.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: isNeverCached, handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
