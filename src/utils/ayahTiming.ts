import type { Moshaf, Reciter } from '../types';

const READS_URL = 'https://www.mp3quran.net/api/v3/ayat_timing/reads';
const TIMING_URL = 'https://www.mp3quran.net/api/v3/ayat_timing';

export type TimingRead = {
  id: number;
  name: string;
  folder_url: string;
};

export type AyahTiming = {
  ayah: number;
  startMs: number;
  endMs: number;
};

type ApiTimingRow = {
  ayah?: number;
  start_time?: number;
  end_time?: number;
};

let readsPromise: Promise<TimingRead[]> | null = null;
let catalogReady = false;
const catalogListeners = new Set<() => void>();
const readIdByServer = new Map<string, number>();
const timingCache = new Map<string, AyahTiming[]>();

/** Normalize CDN folder URLs for equality checks. */
export function normalizeServerUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    let path = u.pathname.replace(/\/+/g, '/');
    if (!path.endsWith('/')) path += '/';
    return `${u.protocol}//${u.host.toLowerCase()}${path}`;
  } catch {
    let s = trimmed.toLowerCase();
    if (!s.endsWith('/')) s += '/';
    return s;
  }
}

function notifyCatalogReady() {
  catalogReady = true;
  catalogListeners.forEach((l) => l());
}

async function loadTimingReads(): Promise<TimingRead[]> {
  if (!readsPromise) {
    readsPromise = (async () => {
      const res = await fetch(READS_URL);
      if (!res.ok) {
        throw new Error(`Timing reads unavailable (${res.status})`);
      }
      const data = (await res.json()) as TimingRead[];
      if (!Array.isArray(data)) {
        notifyCatalogReady();
        return [];
      }

      readIdByServer.clear();
      for (const row of data) {
        if (typeof row?.id !== 'number' || !row.folder_url) continue;
        // Only match by exact audio folder — moshaf.id can collide across riwayas.
        readIdByServer.set(normalizeServerUrl(row.folder_url), row.id);
      }
      notifyCatalogReady();
      return data;
    })().catch((err) => {
      readsPromise = null;
      catalogReady = false;
      throw err;
    });
  }
  return readsPromise;
}

export function isTimingCatalogReady(): boolean {
  return catalogReady;
}

/** Prefetch timing reads so badges can render without waiting on the reader. */
export function ensureTimingCatalog(): Promise<TimingRead[]> {
  return loadTimingReads();
}

export function subscribeTimingCatalog(listener: () => void): () => void {
  catalogListeners.add(listener);
  if (catalogReady) listener();
  else void loadTimingReads().catch(() => {});
  return () => {
    catalogListeners.delete(listener);
  };
}

/** Sync check — only valid after catalog is ready. Exact CDN folder match. */
export function moshafHasAyahTiming(moshaf: Moshaf): boolean {
  if (!catalogReady) return false;
  return readIdByServer.has(normalizeServerUrl(moshaf.server));
}

const isHafsMoshaf = (moshaf: Moshaf): boolean => /hafs/i.test(moshaf.name);

/**
 * Badge for a reciter: only when a Hafs moshaf has timings.
 * Avoids false positives (Maher Mujawwad, Okasha Albizi, etc.) when the
 * usual Hafs listening folder is not timed.
 */
export function reciterHasAyahTiming(reciter: Reciter): boolean {
  if (!catalogReady) return false;
  const hafs = reciter.moshaf.filter(isHafsMoshaf);
  if (hafs.length === 0) return false;
  return hafs.some((m) => moshafHasAyahTiming(m));
}

/**
 * Resolve mp3quran ayat_timing `read` id for the current moshaf audio folder.
 */
export async function resolveTimingReadId(
  moshaf: Moshaf,
  signal?: AbortSignal,
): Promise<number | null> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  await loadTimingReads();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const byServer = readIdByServer.get(normalizeServerUrl(moshaf.server));
  return typeof byServer === 'number' ? byServer : null;
}

export async function fetchAyahTimings(
  readId: number,
  surahId: number,
  signal?: AbortSignal,
): Promise<AyahTiming[]> {
  const cacheKey = `${readId}:${surahId}`;
  const cached = timingCache.get(cacheKey);
  if (cached) return cached;

  const url = `${TIMING_URL}?surah=${surahId}&read=${readId}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Ayah timing unavailable (${res.status})`);
  }
  const data = (await res.json()) as ApiTimingRow[];
  if (!Array.isArray(data)) return [];

  const timings = data
    .map((row) => ({
      ayah: Number(row.ayah),
      startMs: Number(row.start_time),
      endMs: Number(row.end_time),
    }))
    // ayah 0 = basmala / intro — not a QuranAyah card
    .filter(
      (t) =>
        Number.isFinite(t.ayah) &&
        t.ayah > 0 &&
        Number.isFinite(t.startMs) &&
        Number.isFinite(t.endMs),
    )
    .sort((a, b) => a.startMs - b.startMs);

  timingCache.set(cacheKey, timings);
  return timings;
}

/** Ayah whose [startMs, endMs) contains timeSec (last ayah inclusive of end). */
export function findAyahAt(timings: AyahTiming[], timeSec: number): number | null {
  if (!timings.length) return null;
  const ms = Math.max(0, timeSec * 1000);
  const last = timings[timings.length - 1];
  if (ms < timings[0].startMs) return null;
  if (ms >= last.endMs) return last.ayah;

  let lo = 0;
  let hi = timings.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = timings[mid];
    if (ms < t.startMs) {
      hi = mid - 1;
    } else if (ms >= t.endMs) {
      lo = mid + 1;
    } else {
      return t.ayah;
    }
  }
  return null;
}

export function getTimingForAyah(
  timings: AyahTiming[],
  ayah: number,
): AyahTiming | undefined {
  return timings.find((t) => t.ayah === ayah);
}
