import { useEffect, useState } from 'react';

export type ReaderFontScale = 0.9 | 1 | 1.15 | 1.3;

export interface ReaderPrefs {
  fontScale: ReaderFontScale;
  showArabic: boolean;
  showFrench: boolean;
  showPhonetic: boolean;
  /** Open the reader sheet when a new surah starts playing */
  autoOpenOnPlay: boolean;
  /** Highlight the ayah currently heard (when timings exist) */
  syncHighlight: boolean;
}

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  fontScale: 1,
  showArabic: true,
  showFrench: true,
  showPhonetic: false,
  autoOpenOnPlay: false,
  syncHighlight: true,
};

export const READER_FONT_SCALES: ReaderFontScale[] = [0.9, 1, 1.15, 1.3];

const STORAGE_KEY = 'quran_streamer_reader_prefs';

let prefsSnapshot: ReaderPrefs = loadReaderPrefs();
const listeners = new Set<(prefs: ReaderPrefs) => void>();

export function loadReaderPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_READER_PREFS };
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
    const next = { ...DEFAULT_READER_PREFS, ...parsed };
    // Keep at least one text layer visible
    if (!next.showArabic && !next.showFrench && !next.showPhonetic) {
      next.showArabic = true;
    }
    return next;
  } catch {
    return { ...DEFAULT_READER_PREFS };
  }
}

export function saveReaderPrefs(prefs: ReaderPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}

export function getReaderPrefs(): ReaderPrefs {
  return prefsSnapshot;
}

export function updateReaderPrefs(partial: Partial<ReaderPrefs>): ReaderPrefs {
  const merged = { ...prefsSnapshot, ...partial };
  if (!merged.showArabic && !merged.showFrench && !merged.showPhonetic) {
    // Prefer keeping Arabic if user turns the last layer off
    if (partial.showArabic === false && prefsSnapshot.showArabic) {
      merged.showArabic = true;
    } else {
      merged.showArabic = true;
    }
  }
  prefsSnapshot = merged;
  saveReaderPrefs(merged);
  listeners.forEach((l) => l(merged));
  return merged;
}

export function useReaderPrefs(): [ReaderPrefs, (partial: Partial<ReaderPrefs>) => void] {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => prefsSnapshot);

  useEffect(() => {
    const onChange = (next: ReaderPrefs) => setPrefs(next);
    listeners.add(onChange);
    setPrefs(getReaderPrefs());
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return [prefs, updateReaderPrefs];
}
