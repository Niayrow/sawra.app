import type { AyahBookmark, ListenDay, SurahProgress } from './libraryTypes';

const BOOKMARKS_KEY = 'sawra_bookmarks_v1';
const PROGRESS_KEY = 'sawra_surah_progress_v1';
const DAYS_KEY = 'sawra_listen_days_v1';
const PUSHED_DAYS_KEY = 'sawra_listen_days_pushed_v1';

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
};

export const loadLocalBookmarks = (): AyahBookmark[] =>
  readJson<AyahBookmark[]>(BOOKMARKS_KEY, []);

export const saveLocalBookmarks = (rows: AyahBookmark[]) =>
  writeJson(BOOKMARKS_KEY, rows);

export const loadLocalProgress = (): SurahProgress[] =>
  readJson<SurahProgress[]>(PROGRESS_KEY, []);

export const saveLocalProgress = (rows: SurahProgress[]) =>
  writeJson(PROGRESS_KEY, rows);

export const loadLocalListenDays = (): ListenDay[] =>
  readJson<ListenDay[]>(DAYS_KEY, []);

export const saveLocalListenDays = (rows: ListenDay[]) =>
  writeJson(DAYS_KEY, rows);

export type PushedListenDays = Record<string, { seconds: number; sessions: number }>;

export const loadPushedListenDays = (): PushedListenDays =>
  readJson<PushedListenDays>(PUSHED_DAYS_KEY, {});

export const savePushedListenDays = (rows: PushedListenDays) =>
  writeJson(PUSHED_DAYS_KEY, rows);

export const clearLocalLibraryData = () => {
  saveLocalBookmarks([]);
  saveLocalProgress([]);
  saveLocalListenDays([]);
  savePushedListenDays({});
};
