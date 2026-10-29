/* TAL Main Foundry service worker
 * Static assets use stale-while-revalidate: return cached content immediately,
 * refresh it in the background, and repair stale/missing cache entries whenever
 * the network is available. HTML navigations use network-first so deployments
 * are not hidden behind a stale index.html.
 */
'use strict';

const SW_VERSION = 'tal-foundry-sw-v8';
const STATIC_CACHE = `${SW_VERSION}-static`;
const PAGE_CACHE = `${SW_VERSION}-pages`;
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(CORE_ASSETS.map(async (url) => {
      try {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (response.ok && response.type !== 'opaque') await cache.put(url, response);
      } catch (_) {
        // Installation can still complete when an optional shell asset is offline.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key.startsWith('tal-foundry-sw-') && !keep.has(key)) return caches.delete(key);
      return Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response && (response.ok || response.type === 'opaque')) {
      // Clone before storing; never cache failed HTTP responses.
      return cache.put(request, response.clone()).then(() => response);
    }
    return response;
  }).catch(() => null);

  // Return cached data quickly, while the refresh repairs the cache in background.
  if (cached) {
    // Keep the background refresh alive without delaying the response.
    refresh.catch(() => {});
    return cached;
  }

  const fresh = await refresh;
  if (fresh) return fresh;
  return new Response('Offline: this resource is not cached yet.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request) || await caches.match('./index.html') || await caches.match('./');
    if (cached) return cached;
    return new Response('You are offline. Reconnect and reload TAL Main Foundry.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept Supabase, CDNs, or other cross-origin/API traffic.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Only cache assets served by this site. Exclude browser-specific or opaque
  // requests that are not useful to keep in the application cache.
  if (['script', 'style', 'image', 'font', 'worker'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
