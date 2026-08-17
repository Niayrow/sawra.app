const CACHE_VERSION = 'sawra-pwa-v119-icon-black-20260817';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = '/offline.html';

const APP_SHELL_ASSETS = [
  '/',
  '/ecouter',
  '/bibliotheque',
  '/quiz',
  '/apprendre',
  '/radio',
  '/offline.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/fonts/outfit-latin.woff2',
  '/fonts/outfit-latin-ext.woff2',
  '/icons/favicon-32x32.png',
  '/icons/apple-touch-icon-v2.png',
  '/icons/android-chrome-192x192-v2.png',
  '/icons/android-chrome-512x512-v2.png',
  '/icons/maskable-192x192-v2.png',
  '/icons/maskable-512x512-v2.png',
  '/icons/logo.png',
  '/icons/sansfond.webp',
  '/icons/appicon.webp',
  '/icons/artwork.png',
  '/og-image.png',
  '/img/mecca.webp',
  '/img/medine.webp',
  '/img/riyad.webp',
  '/img/sawra.webp',
];

const isMp3QuranRequest = (url) => (
  url.hostname.includes('mp3quran.net')
);

const isStaticAsset = (request) => (
  ['style', 'script', 'worker', 'image', 'font'].includes(request.destination)
);

const putRuntimeCache = async (request, response) => {
  if (!response || response.status !== 200 || response.type === 'opaque') {
    return;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
};

const precacheShellAssets = async (urls) => {
  const cache = await caches.open(APP_SHELL_CACHE);
  await Promise.all(
    (urls || []).map(async (url) => {
      try {
        const request = new Request(url, { credentials: 'same-origin' });
        const existing = await cache.match(request);
        if (existing) return;
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
      } catch {
        // Best-effort install: one missing asset must not fail the whole shell
      }
    })
  );
};

const precacheUrlList = async (urls) => {
  const cache = await caches.open(RUNTIME_CACHE);
  await Promise.all(
    (urls || []).map(async (url) => {
      try {
        const request = new Request(url, { credentials: 'same-origin' });
        const existing = await cache.match(request);
        if (existing) return;
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
      } catch {
        // ignore individual failures
      }
    })
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheShellAssets(APP_SHELL_ASSETS).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PRECACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil(precacheUrlList(event.data.urls));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (isMp3QuranRequest(url)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putRuntimeCache('/', response.clone());
          return response;
        })
        .catch(async () => (
          await caches.match('/') ||
          await caches.match(OFFLINE_URL)
        ))
    );
    return;
  }

  if (url.origin === self.location.origin && isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            putRuntimeCache(request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (url.origin === self.location.origin) {
          putRuntimeCache(request, response.clone());
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
