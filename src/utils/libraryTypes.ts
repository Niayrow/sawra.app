export type AyahBookmark = {
  id: string;
  surahId: number;
  ayah: number;
  reciterId: number | null;
  moshafId: number | null;
  note: string;
  snippetAr: string;
  snippetFr: string;
  createdAt: string;
  updatedAt: string;
};

export type SurahProgress = {
  reciterId: number;
  moshafId: number;
  surahId: number;
  positionSeconds: number;
  ayah: number | null;
  updatedAt: string;
};

export type ListenDay = {
  day: string;
  seconds: number;
  sessions: number;
  tzOffsetMinutes: number | null;
  updatedAt: string;
};

export const bookmarkKey = (surahId: number, ayah: number) => `${surahId}:${ayah}`;

export const progressKey = (reciterId: number, moshafId: number, surahId: number) =>
  `${reciterId}:${moshafId}:${surahId}`;

export const clipSnippet = (text: string, max = 120): string => {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
};

export const STREAK_MIN_SECONDS = 60;
export const BOOKMARK_PAGE_SIZE = 30;
export const NOTE_MAX_LENGTH = 2000;
