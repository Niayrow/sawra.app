import { RECITER_BACKGROUND, RECITER_IMAGES } from './images';
import { RECITER_CATEGORIES } from '../data/reciterCategories';
import { isProd } from '../lib/env';

const PRECACHE_META_KEY = 'sawra.app-shell-precache';

const STATIC_SHELL = [
  '/',
  '/ecouter',
  '/bibliotheque',
  '/quiz',
  '/apprendre',
  '/radio',
  '/offline.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/icons/sansfond.webp',
  '/icons/appicon.webp',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/apple-touch-icon-v2.png',
  '/icons/android-chrome-192x192-v2.png',
  '/icons/artwork.png',
  '/fonts/outfit-latin.woff2',
  RECITER_BACKGROUND,
];

type PrecacheMeta = {
  buildId: string;
  urlCount: number;
  completedAt: number;
};

/**
 * Build fingerprint from current hashed JS/CSS entrypoints (`/_next/static/...`).
 * Changes automatically on each deploy — no manual bump needed.
 */
const getAppBuildId = (): string => {
  const parts: string[] = [];

  document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((el) => {
    try {
      const path = new URL(el.src).pathname;
      if (path.includes('/_next/') || path.endsWith('.js')) parts.push(path);
    } catch {
      /* ignore */
    }
  });

  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach((el) => {
    try {
      parts.push(new URL(el.href).pathname);
    } catch {
      /* ignore */
    }
  });

  return parts.sort().join('|');
};

const readPrecacheMeta = (): PrecacheMeta | null => {
  try {
    const raw = localStorage.getItem(PRECACHE_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrecacheMeta;
    if (!parsed?.buildId || typeof parsed.urlCount !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writePrecacheMeta = (buildId: string, urlCount: number) => {
  try {
    const meta: PrecacheMeta = {
      buildId,
      urlCount,
      completedAt: Date.now(),
    };
    localStorage.setItem(PRECACHE_META_KEY, JSON.stringify(meta));
  } catch {
    // Storage may be blocked — precache still works without the skip flag
  }
};

const waitForServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;
  const ready = await navigator.serviceWorker.ready.catch(() => null);
  if (!ready) return;
  if (navigator.serviceWorker.controller) return;
  await new Promise<void>((resolve) => {
    const onChange = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.removeEventListener('controllerchange', onChange);
        resolve();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve();
    }, 4000);
  });
};

const collectShellUrls = (): string[] => {
  const origin = window.location.origin;
  const urls = new Set<string>();

  for (const path of STATIC_SHELL) {
    urls.add(new URL(path, origin).href);
  }

  document
    .querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
      'script[src], link[rel="stylesheet"], link[rel="modulepreload"], link[rel="preload"]'
    )
    .forEach((el) => {
      const href = 'href' in el && el.href ? el.href : (el as HTMLScriptElement).src;
      if (href && href.startsWith(origin)) urls.add(href);
    });

  Object.values(RECITER_IMAGES).forEach((path) => {
    urls.add(new URL(path, origin).href);
  });

  RECITER_CATEGORIES.forEach((category) => {
    urls.add(new URL(category.image, origin).href);
  });

  return Array.from(urls);
};

const isUrlCached = async (url: string): Promise<boolean> => {
  try {
    const match = await caches.match(url, { ignoreSearch: false });
    return Boolean(match);
  } catch {
    return false;
  }
};

/** True when this build was already fully precached and every URL is still present. */
const isShellUpToDate = async (buildId: string, urls: string[]): Promise<boolean> => {
  if (!buildId || urls.length === 0) return false;
  const meta = readPrecacheMeta();
  if (!meta || meta.buildId !== buildId || meta.urlCount !== urls.length) {
    return false;
  }

  for (const url of urls) {
    if (!(await isUrlCached(url))) return false;
  }
  return true;
};

const fetchMissingWithConcurrency = async (urls: string[], concurrency = 4) => {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (index < urls.length) {
      const current = urls[index];
      index += 1;
      try {
        if (await isUrlCached(current)) continue;
        await fetch(current, { credentials: 'same-origin', cache: 'force-cache' });
      } catch {
        // Best-effort precache — ignore individual failures
      }
    }
  });
  await Promise.all(workers);
};

/**
 * After first paint, warm the service-worker caches so app navigation
 * keeps working offline (audio downloads remain separate / on demand).
 *
 * Skips entirely when the current app build was already precached and
 * all shell URLs are still in Cache Storage — avoids re-downloading
 * on every launch until the next deploy.
 */
export const precacheAppShellInBackground = (): void => {
  if (!isProd) return;
  if (typeof window === 'undefined') return;
  if (!navigator.onLine) return;
  if (!('caches' in window) || !('serviceWorker' in navigator)) return;

  const run = async () => {
    try {
      await waitForServiceWorker();
      if (!navigator.onLine) return;

      const buildId = getAppBuildId();
      const urls = collectShellUrls();
      if (urls.length === 0) return;

      if (await isShellUpToDate(buildId, urls)) {
        return;
      }

      await fetchMissingWithConcurrency(urls, 4);

      const registration = await navigator.serviceWorker.ready.catch(() => null);
      registration?.active?.postMessage({ type: 'PRECACHE_URLS', urls, buildId });

      // Only mark complete if everything is actually cached now
      let missing = 0;
      for (const url of urls) {
        if (!(await isUrlCached(url))) missing += 1;
      }
      if (missing === 0 && buildId) {
        writePrecacheMeta(buildId, urls.length);
      }
    } catch {
      // Silent — precache must never break the app
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => {
      void run();
    }, { timeout: 5000 });
  } else {
    window.setTimeout(() => {
      void run();
    }, 1800);
  }
};
